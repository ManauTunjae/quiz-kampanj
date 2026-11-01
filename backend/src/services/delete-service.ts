import { supabase } from '../database/supabase.js'

// Radera data. Bara för inloggade admins (se index.ts).
// Båda funktionerna returnerar false om raden inte finns ELLER inte tillhör den inloggade
// (samma svar i båda fallen, så ingen kan gissa vad andra har).

function failed(what: string, message: string): never {
  throw new Error(`Kunde inte radera ${what}: ${message}`)
}

// ---------- Radera en hel kampanj ----------
// Databasen raderar frågor, alternativ, deltagare, svar och leads automatiskt
// ("on delete cascade" i schema.sql).
export async function deleteCampaign(campaignId: string, ownerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('owner_id', ownerId)
    .select('id')

  if (error) failed('kampanj', error.message)
  return (data ?? []).length > 0
}

// ---------- Radera en lead (en persons namn och e-post) ----------
// Vi raderar bara leaden. Deltagaren och svaren finns kvar (de är anonyma),
// så statistiken stämmer fortfarande.
export async function deleteLead(campaignId: string, leadId: string, ownerId: string): Promise<boolean> {
  // 1) Tillhör kampanjen den inloggade?
  const { data: campaign, error: cError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (cError) failed('lead', cError.message)
  if (!campaign) return false

  // 2) Tillhör leaden den kampanjen?
  const { data: lead, error: lError } = await supabase
    .from('leads')
    .select('id, submissions!inner(campaign_id)')
    .eq('id', leadId)
    .eq('submissions.campaign_id', campaignId)
    .maybeSingle()
  if (lError) failed('lead', lError.message)
  if (!lead) return false

  // 3) Radera
  const { error } = await supabase.from('leads').delete().eq('id', leadId)
  if (error) failed('lead', error.message)
  return true
}
