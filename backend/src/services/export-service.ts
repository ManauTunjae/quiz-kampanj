import { supabase } from '../database/supabase.js'
import { toCsv } from '../lib/csv.js'

// Export av leads till CSV. Bara för inloggade admins (se index.ts).
// Innehåller personuppgifter: vi loggar aldrig innehållet.

const PAGE = 1000 // hur många leads vi hämtar åt gången
const MAX_PAGES = 100 // spärr: högst 100 000 leads i en fil

const dateTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  dateStyle: 'short',
  timeStyle: 'short',
})

function failed(message: string): never {
  throw new Error(`Kunde inte exportera leads: ${message}`)
}

// Returnerar null om kampanjen inte finns ELLER inte tillhör den inloggade.
export async function exportLeadsCsv(campaignId: string, ownerId: string) {
  const { data: campaign, error: cError } = await supabase
    .from('campaigns')
    .select('id, slug')
    .eq('id', campaignId)
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (cError) failed(cError.message)
  if (!campaign) return null

  const rows: (string | number)[][] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('leads')
      .select('name, email, consent_at, created_at, submissions!inner(campaign_id, score, total)')
      .eq('submissions.campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }) // samma ordning varje gång, så inga rader hoppas över
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (error) failed(error.message)

    for (const row of data ?? []) {
      // Ett-till-ett-relation: kan komma som objekt eller som lista med en rad
      const s = Array.isArray(row.submissions) ? row.submissions[0] : row.submissions
      rows.push([
        row.name,
        row.email,
        s?.score ?? 0,
        s?.total ?? 0,
        dateTime.format(new Date(row.consent_at)),
        dateTime.format(new Date(row.created_at)),
      ])
    }
    if ((data ?? []).length < PAGE) break
  }

  const csv = toCsv(['Namn', 'E-post', 'Poäng', 'Antal frågor', 'Samtycke givet', 'Skapad'], rows)
  return { slug: campaign.slug, csv }
}
