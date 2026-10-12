import { z } from 'zod'

const referenceType = z.enum(['absolute', 'relative'])

export const createProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  categoryId: z.number().int().nullish(),
  stepsJson: z.string().min(1),
  userId: z.number().int().positive(),
  referenceType: referenceType.default('absolute'),
})

// Partial update: a null or missing field is left as it is.
export const updateProgramSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish(),
  categoryId: z.number().int().nullish(),
  stepsJson: z.string().nullish(),
  userId: z.number().int().positive().nullish(),
  creationDate: z.string().nullish(),
  updateDate: z.string().nullish(),
  usageCount: z.number().int().nullish(),
  referenceType: referenceType.nullish(),
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>
