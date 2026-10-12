import { createUser, listActiveUsers } from '@/server/data/users'
import { describe, fail, isDuplicateEntry, readJson } from '@/server/http'
import { createNamedSchema } from '@/server/validation/names'

export async function GET() {
  try {
    return Response.json(await listActiveUsers())
  } catch (e) {
    return fail(`Error obteniendo los usuarios: ${describe(e)}`, 500)
  }
}

export async function POST(request: Request) {
  const parsed = createNamedSchema.safeParse(await readJson(request))
  if (!parsed.success) return fail('El nombre es requerido', 400)

  try {
    const id = await createUser(parsed.data.name)
    return Response.json({ success: true, message: 'Usuario creado correctamente', id }, { status: 201 })
  } catch (e) {
    if (isDuplicateEntry(e)) return fail('Ya existe un usuario con ese nombre', 409)
    return fail(`Error creando el usuario: ${describe(e)}`, 500)
  }
}
