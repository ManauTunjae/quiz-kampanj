import { supabase } from '../database/supabase.js'

// Siffror och leads till admin-dashboarden. Bara för inloggade admins (se index.ts).

function failed(what: string, message: string): never {
  throw new Error(`Kunde inte hämta ${what}: ${message}`)
}

// Räknar rader utan att hämta dem ("head: true" ger bara antalet).
async function countAnswersForOption(optionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('option_id', optionId)
  if (error) failed('svar', error.message)
  return count ?? 0
}

// ---------- Statistik för en kampanj ----------
// Returnerar null om kampanjen inte finns.
export async function getCampaignStats(campaignId: string) {
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(
      'id, slug, title, accent_color, questions(id, position, text, options(id, position, text, is_correct))'
    )
    .eq('id', campaignId)
    .maybeSingle()

  if (error) failed('kampanj', error.message)
  if (!campaign) return null

  // Antal deltagare och antal leads för kampanjen
  const [participants, leads] = await Promise.all([
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
    supabase
      .from('leads')
      .select('id, submissions!inner(campaign_id)', { count: 'exact', head: true })
      .eq('submissions.campaign_id', campaignId),
  ])
  if (participants.error) failed('deltagare', participants.error.message)
  if (leads.error) failed('leads', leads.error.message)

  const participantCount = participants.count ?? 0
  const leadCount = leads.count ?? 0

  // Hur många som valt varje alternativ (en räknefråga per alternativ, max 5 x 6)
  const questions = await Promise.all(
    [...(campaign.questions ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(async (q) => {
        const options = await Promise.all(
          [...(q.options ?? [])]
            .sort((a, b) => a.position - b.position)
            .map(async (o) => ({
              id: o.id,
              position: o.position,
              text: o.text,
              isCorrect: o.is_correct === true,
              count: await countAnswersForOption(o.id),
            }))
        )
        const answerCount = options.reduce((sum, o) => sum + o.count, 0)
        return {
          id: q.id,
          position: q.position,
          text: q.text,
          answerCount,
          correctCount: options.filter((o) => o.isCorrect).reduce((sum, o) => sum + o.count, 0),
          options: options.map((o) => ({
            ...o,
            percent: answerCount === 0 ? 0 : Math.round((o.count / answerCount) * 100),
          })),
        }
      })
  )

  // Snittpoäng = totalt antal rätta svar / antal deltagare (alla svarar på alla frågor)
  const totalCorrect = questions.reduce((sum, q) => sum + q.correctCount, 0)
  const averageScore = participantCount === 0 ? null : Math.round((totalCorrect / participantCount) * 10) / 10

  return {
    campaign: {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      accentColor: campaign.accent_color,
    },
    participantCount,
    leadCount,
    questionCount: questions.length,
    averageScore,
    questions: questions.map((q) => ({
      id: q.id,
      position: q.position,
      text: q.text,
      answerCount: q.answerCount,
      options: q.options,
    })),
  }
}

// ---------- Leads för en kampanj (nyaste först) ----------
// Returnerar null om kampanjen inte finns.
export async function listLeads(campaignId: string, limit: number, offset: number) {
  const { data: campaign, error: cError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .maybeSingle()
  if (cError) failed('kampanj', cError.message)
  if (!campaign) return null

  const { data, count, error } = await supabase
    .from('leads')
    .select('id, name, email, consent_at, created_at, submissions!inner(campaign_id, score, total)', {
      count: 'exact',
    })
    .eq('submissions.campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) failed('leads', error.message)

  return {
    total: count ?? 0,
    limit,
    offset,
    leads: (data ?? []).map((row) => {
      // Ett-till-ett-relation: kan komma som objekt eller som lista med en rad
      const s = Array.isArray(row.submissions) ? row.submissions[0] : row.submissions
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        score: s?.score ?? 0,
        total: s?.total ?? 0,
        consentAt: row.consent_at,
        createdAt: row.created_at,
      }
    }),
  }
}
