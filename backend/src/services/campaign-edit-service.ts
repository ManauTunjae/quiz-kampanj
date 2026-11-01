import { supabase } from '../database/supabase.js'
import type { UpdateCampaignInput } from '../validation/campaign.js'

// Hämta och ändra en kampanj (admin). Alla frågor filtrerar på ägaren (owner_id):
// någon annans kampanj ger samma svar som en kampanj som inte finns.

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

// ---------- Hela kampanjen, inklusive vilket svar som är rätt (för redigeringsformuläret) ----------
export async function getCampaignDetail(campaignId: string, ownerId: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, slug, title, accent_color, is_active, questions(id, position, text, options(id, position, text, is_correct))')
    .eq('id', campaignId)
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error) throw new Error(`Kunde inte hämta kampanj: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    accentColor: data.accent_color,
    isActive: data.is_active !== false,
    questions: [...(data.questions ?? [])].sort(byPosition).map((q) => ({
      id: q.id,
      position: q.position,
      text: q.text,
      options: [...(q.options ?? [])].sort(byPosition).map((o) => ({
        id: o.id,
        position: o.position,
        text: o.text,
        isCorrect: o.is_correct === true,
      })),
    })),
  }
}

type Detail = NonNullable<Awaited<ReturnType<typeof getCampaignDetail>>>

export type UpdateResult =
  | { ok: true; campaign: Detail }
  | { ok: false; reason: 'not_found' | 'structure_mismatch' }

// ---------- Ändra titel, färg, pausad/aktiv och texter ----------
export async function updateCampaign(
  campaignId: string,
  ownerId: string,
  input: UpdateCampaignInput
): Promise<UpdateResult> {
  const current = await getCampaignDetail(campaignId, ownerId)
  if (!current) return { ok: false, reason: 'not_found' }

  // Frågorna och alternativen som skickas in måste vara EXAKT de som finns (samma id:n).
  // Då kan ingen ändra en fråga i en annan kampanj, och inget läggs till eller tas bort.
  if (input.questions) {
    const existing = new Map(current.questions.map((q) => [q.id, new Set(q.options.map((o) => o.id))]))
    const sentIds = new Set(input.questions.map((q) => q.id))
    const sameQuestions = input.questions.length === existing.size && sentIds.size === existing.size && [...sentIds].every((id) => existing.has(id))
    const sameOptions =
      sameQuestions &&
      input.questions.every((q) => {
        const ids = existing.get(q.id)
        const sent = new Set(q.options.map((o) => o.id))
        return ids !== undefined && sent.size === ids.size && q.options.length === ids.size && [...sent].every((id) => ids.has(id))
      })
    if (!sameOptions) return { ok: false, reason: 'structure_mismatch' }
  }

  const patch: Record<string, string | boolean> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.accentColor !== undefined) patch.accent_color = input.accentColor
  if (input.isActive !== undefined) patch.is_active = input.isActive

  // Supabase har inga transaktioner här. Det är bara texter som ändras, så
  // om något går fel mitt i kan man bara spara igen.
  const jobs: PromiseLike<{ error: { message: string } | null }>[] = []
  if (Object.keys(patch).length > 0) {
    jobs.push(supabase.from('campaigns').update(patch).eq('id', campaignId).eq('owner_id', ownerId))
  }
  for (const q of input.questions ?? []) {
    jobs.push(supabase.from('questions').update({ text: q.text }).eq('id', q.id).eq('campaign_id', campaignId))
    for (const o of q.options) {
      jobs.push(supabase.from('options').update({ text: o.text }).eq('id', o.id).eq('question_id', q.id))
    }
  }

  const results = await Promise.all(jobs)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(`Kunde inte ändra kampanj: ${failed.error.message}`)

  const updated = await getCampaignDetail(campaignId, ownerId)
  if (!updated) return { ok: false, reason: 'not_found' }
  return { ok: true, campaign: updated }
}
