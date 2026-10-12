import { createProgram, listPrograms } from '@/server/data/programs'
import { describe, fail, readJson } from '@/server/http'
import { createProgramSchema } from '@/server/validation/programs'

export async function GET() {
  try {
    return Response.json(await listPrograms())
  } catch (e) {
    return fail(`Error obteniendo los programas: ${describe(e)}`, 500)
  }
}

export async function POST(request: Request) {
  const parsed = createProgramSchema.safeParse(await readJson(request))
  if (!parsed.success) return fail('El nombre, los pasos y el creador son requeridos', 400)

  try {
    const id = await createProgram(parsed.data)
    return Response.json({ success: true, message: 'Programa creado correctamente', id }, { status: 201 })
  } catch (e) {
    return fail(`Error creando el programa: ${describe(e)}`, 500)
  }
}
