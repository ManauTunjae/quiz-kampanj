import { z } from 'zod'

export const loginSchema = z.object({
  password: z.string().min(1, 'Skriv ett lösenord').max(200),
})
