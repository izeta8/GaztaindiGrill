import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'

export const listActiveUsers = async () => {
  const rows = await db.select().from(users).where(eq(users.isActive, 1))
  // ISO with a T, as the FastAPI service sent it: Safari cannot parse the SQL form.
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    creation_date: u.creationDate?.replace(' ', 'T') ?? null,
    is_active: u.isActive,
  }))
}

export const createUser = async (name: string) => {
  const [{ id }] = await db.insert(users).values({ name }).$returningId()
  return id
}
