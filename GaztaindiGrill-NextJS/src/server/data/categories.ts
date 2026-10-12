import 'server-only'
import { db } from '@/db'
import { categories } from '@/db/schema'

export const listCategories = () => db.select().from(categories)

export const createCategory = async (name: string) => {
  const [{ id }] = await db.insert(categories).values({ name }).$returningId()
  return id
}
