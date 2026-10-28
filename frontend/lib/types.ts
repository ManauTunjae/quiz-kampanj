// Typer som matchar backendens JSON (camelCase).

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
