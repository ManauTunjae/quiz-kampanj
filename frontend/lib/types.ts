// Typer som matchar backendens JSON (camelCase).

// ---------- Publik quiz (för besökare). Innehåller ALDRIG rätt svar. ----------
export type PublicOption = { id: string; text: string }
export type PublicQuestion = { id: string; text: string; options: PublicOption[] }
export type PublicCampaign = {
  id: string
  slug: string
  title: string
  accentColor: string
  questions: PublicQuestion[]
}

// Besökarens svar som skickas in, och resultatet som servern räknat ut.
export type SubmittedAnswer = { questionId: string; optionId: string }
export type SubmissionResult = { submissionId: string; score: number; total: number }

export type CampaignSummary = {
  id: string
  slug: string
  title: string
  accentColor: string
  createdAt: string
  questionCount: number
  participantCount: number
}

export type CreatedCampaign = {
  id: string
  slug: string
  title: string
  accentColor: string
  publicPath: string
}

export type NewCampaignInput = {
  title: string
  accentColor: string
  questions: {
    text: string
    options: { text: string; isCorrect: boolean }[]
  }[]
}
