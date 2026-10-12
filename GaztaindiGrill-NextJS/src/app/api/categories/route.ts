import { createCategory, listCategories } from '@/server/data/categories'
import { describe, fail, isDuplicateEntry, readJson } from '@/server/http'
import { createNamedSchema } from '@/server/validation/names'

export async function GET() {
  try {
    return Response.json(await listCategories())
  } catch (e) {
    return fail(`Error obteniendo las categorias: ${describe(e)}`, 500)
  }
}

export async function POST(request: Request) {
  const parsed = createNamedSchema.safeParse(await readJson(request))
  if (!parsed.success) return fail('El nombre es requerido', 400)

  try {
    const id = await createCategory(parsed.data.name)
    return Response.json({ success: true, message: 'Categoria creada correctamente', id }, { status: 201 })
  } catch (e) {
    if (isDuplicateEntry(e)) return fail('Ya existe una categoría con ese nombre', 409)
    return fail(`Error creando la categoria: ${describe(e)}`, 500)
  }
}
