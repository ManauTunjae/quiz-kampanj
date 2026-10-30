import { z } from 'zod'

// Regler för att skapa en kampanj. Används av POST /api/admin/campaigns.

const optionSchema = z.object({
  text: z.string().trim().min(1, 'Alternativet saknar text').max(200),
  isCorrect: z.boolean(),
})

const questionSchema = z
  .object({
    text: z.string().trim().min(1, 'Frågan saknar text').max(300),
    options: z.array(optionSchema).min(2, 'Minst 2 alternativ').max(4, 'Max 4 alternativ'),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Exakt ett alternativ måste vara rätt',
    path: ['options'],
  })

export const createCampaignSchema = z.object({
  title: z.string().trim().min(1, 'Titel saknas').max(120),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Färgen ska se ut så här: #E3B6B1')
    .default('#E3B6B1'),
  questions: z
    .array(questionSchema)
    .min(3, 'Minst 3 frågor')
    .max(5, 'Max 5 frågor'),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
