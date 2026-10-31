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
export type SubmissionResult = {
  submissionId: string
  score: number
  total: number
  consentText: string // samtyckestexten kommer från servern (visas bredvid rutan)
}
export type LeadInput = { name: string; email: string; consent: boolean }

// ---------- Admin-dashboard ----------
export type StatsOption = {
  id: string
  position: number
  text: string
  isCorrect: boolean
  count: number
  percent: number
}
export type StatsQuestion = {
  id: string
  position: number
  text: string
  answerCount: number
  options: StatsOption[]
}
export type CampaignStats = {
  campaign: { id: string; slug: string; title: string; accentColor: string }
  participantCount: number
  leadCount: number
  questionCount: number
  averageScore: number | null
  questions: StatsQuestion[]
}
export type LeadRow = {
  id: string
  name: string
  email: string
  score: number
  total: number
  consentAt: string
  createdAt: string
}
export type LeadsPage = { total: number; limit: number; offset: number; leads: LeadRow[] }

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
