import { randomBytes } from 'node:crypto'
import { supabase } from '../database/supabase.js'
import type { CreateCampaignInput } from '../validation/campaign.js'
import { slugify } from '../utils/slugify.js'

// Affärslogiken för kampanjer. Routes anropar de här funktionerna.
// Om något går fel kastar vi ett Error. index.ts fångar det (app.onError) och svarar 500.

// ---------- Lista med antal frågor och deltagare ----------
export async function listCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, slug, title, accent_color, created_at, questions(count), submissions(count)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Kunde inte hämta kampanjer: ${error.message}`)

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    accentColor: row.accent_color,
    createdAt: row.created_at,
    questionCount: row.questions?.[0]?.count ?? 0,
    participantCount: row.submissions?.[0]?.count ?? 0,
  }))
}

// ---------- Skapa kampanj med frågor och alternativ ----------
export async function createCampaign(input: CreateCampaignInput) {
  // 1) Skapa kampanjen. Om sluggen redan finns, lägg till fyra slumptecken.
  const baseSlug = slugify(input.title)
  let slug = baseSlug
  let campaign: { id: string; slug: string; title: string; accent_color: string } | null = null

  for (let attempt = 0; attempt < 4 && !campaign; attempt++) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ slug, title: input.title, accent_color: input.accentColor })
      .select('id, slug, title, accent_color')
      .single()

    if (!error) {
      campaign = data
    } else if (error.code === '23505') {
      // 23505 = unique violation (sluggen finns redan)
      slug = `${baseSlug}-${randomBytes(2).toString('hex')}`
    } else {
      throw new Error(`Kunde inte skapa kampanj: ${error.message}`)
    }
  }
  if (!campaign) throw new Error('Kunde inte skapa en unik länk (slug)')

  const campaignId = campaign.id

  // Supabase har inga transaktioner här. Går något fel nedan
  // tar vi bort kampanjen igen (frågor och alternativ följer med: "on delete cascade").
  const rollbackAndThrow = async (message: string): Promise<never> => {
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)
    if (error) console.error('Kunde inte städa upp kampanj', campaignId, error.message)
    throw new Error(message)
  }

  // 2) Frågorna (position 1, 2, 3 ...)
  const { data: questionRows, error: qError } = await supabase
    .from('questions')
    .insert(
      input.questions.map((q, i) => ({
        campaign_id: campaignId,
        position: i + 1,
        text: q.text,
      }))
    )
    .select('id, position')

  if (qError || !questionRows) {
    return rollbackAndThrow(`Kunde inte spara frågor: ${qError?.message}`)
  }

  // 3) Alternativen. Vi matchar fråga och id via position.
  const questionIdByPosition = new Map<number, string>(
    questionRows.map((r) => [r.position as number, r.id as string])
  )
  const optionRows = input.questions.flatMap((q, qi) =>
    q.options.map((o, oi) => ({
      question_id: questionIdByPosition.get(qi + 1),
      position: oi + 1,
      text: o.text,
      is_correct: o.isCorrect,
    }))
  )

  const { error: oError } = await supabase.from('options').insert(optionRows)
  if (oError) {
    return rollbackAndThrow(`Kunde inte spara alternativ: ${oError.message}`)
  }

  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    accentColor: campaign.accent_color,
    publicPath: `/q/${campaign.slug}`,
  }
}
