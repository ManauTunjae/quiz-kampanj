import { z } from 'zod'

// Samma regel som i databasen (schema.sql): små bokstäver, siffror och bindestreck.
export const slugParamSchema = z.object({
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
})
