import { supabase } from '../database/supabase.js'
import type { SubmitAnswersInput } from '../validation/submission.js'

// Tar emot besökarens svar, RÄKNAR POÄNGEN PÅ SERVERN och sparar resultatet.
// Rätt svar (is_correct) hämtas här, men lämnar aldrig servern.

export type SubmitResult =
  | { ok: true; submissionId: string; score: number; total: number }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'invalid_answers' }

export async function submitAnswers(
  slug: string,
  answers: SubmitAnswersInput['answers']
): Promise<SubmitResult> {
  // 1) Hämta kampanjen med frågor, alternativ och vilka som är rätt
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, questions(id, options(id, is_correct))')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`Kunde inte hämta kampanj: ${error.message}`)
  if (!campaign) return { ok: false, reason: 'not_found' }

  // frågans id → (alternativets id → är det rätt?)
  const correctness = new Map<string, Map<string, boolean>>()
  for (const q of campaign.questions ?? []) {
    correctness.set(q.id, new Map((q.options ?? []).map((o) => [o.id, o.is_correct === true])))
  }
  const total = correctness.size

  // 2) Kontrollera att svaren passar kampanjen: exakt ett svar per fråga,
  //    och varje alternativ måste höra till sin fråga.
  const answeredQuestions = new Set(answers.map((a) => a.questionId))
  const everyQuestionAnsweredOnce = answers.length === total && answeredQuestions.size === total
  const everyOptionBelongs = answers.every((a) => correctness.get(a.questionId)?.has(a.optionId))

  if (total === 0 || !everyQuestionAnsweredOnce || !everyOptionBelongs) {
    return { ok: false, reason: 'invalid_answers' }
  }

  // 3) Räkna poängen
  const score = answers.filter((a) => correctness.get(a.questionId)?.get(a.optionId)).length

  // 4) Spara. Supabase har inga transaktioner här: går det fel tar vi bort
  //    deltagaren igen (svaren följer med: "on delete cascade").
  const { data: submission, error: sError } = await supabase
    .from('submissions')
    .insert({ campaign_id: campaign.id, score, total })
    .select('id')
    .single()

  if (sError || !submission) throw new Error(`Kunde inte spara deltagare: ${sError?.message}`)

  const { error: aError } = await supabase.from('answers').insert(
    answers.map((a) => ({
      submission_id: submission.id,
      question_id: a.questionId,
      option_id: a.optionId,
    }))
  )

  if (aError) {
    const { error: cleanupError } = await supabase.from('submissions').delete().eq('id', submission.id)
    if (cleanupError) console.error('Kunde inte städa upp deltagare', submission.id, cleanupError.message)
    throw new Error(`Kunde inte spara svar: ${aError.message}`)
  }

  return { ok: true, submissionId: submission.id, score, total }
}
