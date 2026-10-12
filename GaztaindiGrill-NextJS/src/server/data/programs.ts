import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { programs, users } from '@/db/schema'
import type { CreateProgramInput, UpdateProgramInput } from '@/server/validation/programs'

// snake_case on the wire, as the client reads it (docs/api.md).
const programColumns = {
  id: programs.id,
  name: programs.name,
  description: programs.description,
  category_id: programs.categoryId,
  steps_json: programs.stepsJson,
  usage_count: programs.usageCount,
  creation_date: programs.creationDate,
  update_date: programs.updateDate,
  is_active: programs.isActive,
  reference_type: programs.referenceType,
  user_id: programs.userId,
  user_name: users.name,
}

const selectPrograms = () =>
  db.select(programColumns).from(programs).innerJoin(users, eq(programs.userId, users.id))

export const listPrograms = () => selectPrograms().where(eq(programs.isActive, 1))

// Not filtered by is_active, unlike the list: this is fetched by explicit id.
export const getProgram = async (id: number) => {
  const [program] = await selectPrograms().where(eq(programs.id, id)).limit(1)
  return program ?? null
}

export const createProgram = async (input: CreateProgramInput) => {
  const [{ id }] = await db
    .insert(programs)
    .values({
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      stepsJson: input.stepsJson,
      userId: input.userId,
      referenceType: input.referenceType,
    })
    .$returningId()
  return id
}

// false when there is nothing to set, null when the program does not exist.
export const updateProgram = async (id: number, input: UpdateProgramInput) => {
  const values = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value != null)
  ) as Partial<typeof programs.$inferInsert>

  if (Object.keys(values).length === 0) return false

  // mysql2 counts matched rows, so an update that changes nothing still finds the program.
  const [result] = await db.update(programs).set(values).where(eq(programs.id, id))
  return result.affectedRows > 0 ? true : null
}

export const deactivateProgram = async (id: number) => {
  const [program] = await db
    .select({ isActive: programs.isActive })
    .from(programs)
    .where(eq(programs.id, id))
    .limit(1)

  if (!program) return 'not_found'
  if (program.isActive === 0) return 'already_inactive'

  await db.update(programs).set({ isActive: 0 }).where(eq(programs.id, id))
  return 'deactivated'
}
