import { deactivateProgram, getProgram, updateProgram } from '@/server/data/programs'
import { describe, fail, parseId, readJson } from '@/server/http'
import { updateProgramSchema } from '@/server/validation/programs'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  const id = parseId((await params).id)
  if (id == null) return fail('Id de programa no válido', 400)

  try {
    const program = await getProgram(id)
    if (!program) return fail('Programa no encontrado', 404)
    return Response.json(program)
  } catch (e) {
    return fail(`Error obteniendo el programa: ${describe(e)}`, 500)
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const id = parseId((await params).id)
  if (id == null) return fail('Id de programa no válido', 400)

  const parsed = updateProgramSchema.safeParse(await readJson(request))
  if (!parsed.success) return fail('Los datos del programa no son válidos', 400)

  try {
    const updated = await updateProgram(id, parsed.data)
    if (updated === false) return fail('No se proporcionaron campos para actualizar', 400)
    if (updated === null) return fail('Programa no encontrado', 404)
    return Response.json({ success: true, message: 'Programa actualizado correctamente' })
  } catch (e) {
    return fail(`Error actualizando el programa: ${describe(e)}`, 500)
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const id = parseId((await params).id)
  if (id == null) return fail('Id de programa no válido', 400)

  try {
    const result = await deactivateProgram(id)
    if (result === 'not_found') return fail('Programa no encontrado', 404)
    if (result === 'already_inactive') return fail('El programa ya está inactivo', 400)
    return Response.json({ success: true, message: 'Programa desactivado correctamente' })
  } catch (e) {
    return fail(`Error desactivando el programa: ${describe(e)}`, 500)
  }
}
