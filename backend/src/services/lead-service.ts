import { CONSENT_TEXT } from '../lib/consent.js'
import { supabase } from '../database/supabase.js'
import type { LeadInput } from '../validation/lead.js'

export type SaveLeadResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_saved' }

// Sparar en lead (namn + e-post + samtycke) för en deltagare.
// Databasen vaktar reglerna åt oss:
//   - submission_id måste finnas (främmande nyckel)   → felkod 23503
//   - bara en lead per deltagare (unique)             → felkod 23505
//   - consent måste vara true (check)
// Vi loggar aldrig namn eller e-post.
export async function saveLead(submissionId: string, lead: LeadInput): Promise<SaveLeadResult> {
  const { error } = await supabase.from('leads').insert({
    submission_id: submissionId,
    name: lead.name,
    email: lead.email,
    consent: true,
    consent_text: CONSENT_TEXT,
    consent_at: new Date().toISOString(),
  })

  if (!error) return { ok: true }
  if (error.code === '23503') return { ok: false, reason: 'not_found' }
  if (error.code === '23505') return { ok: false, reason: 'already_saved' }
  throw new Error(`Kunde inte spara lead: ${error.code ?? ''} ${error.message}`)
}
