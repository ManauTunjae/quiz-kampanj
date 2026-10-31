import { z } from 'zod'

// Besökarens svar: ett alternativ per fråga. Poängen skickas INTE av besökaren,
// den räknas ut på servern. (Extra fält som "score" i anropet ignoreras.)
export const submitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.uuid(),
        optionId: z.uuid(),
      })
    )
    .min(1, 'Svar saknas')
    .max(5, 'För många svar'),
})

export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>
