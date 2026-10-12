import { z } from 'zod'

// Categories and users are created from a name alone.
export const createNamedSchema = z.object({
  name: z.string().trim().min(1),
})
