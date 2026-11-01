import { createAuthClient } from '../database/supabase-auth.js'
import { env } from '../config/env.js'
import type { SessionUser } from '../lib/session.js'

// Registrering och inloggning via Supabase Auth.
// Användarna ligger i Supabase (auth.users). Lösenorden hanteras av Supabase: vi ser dem aldrig sparade.
// Vi loggar aldrig e-post eller lösenord.

export type RegisterResult =
  | { ok: true; needsConfirmation: false; user: SessionUser }
  | { ok: true; needsConfirmation: true }
  | { ok: false; reason: 'cannot_create' | 'weak_password' | 'rate_limited' }

export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: 'invalid_credentials' | 'not_confirmed' | 'rate_limited' }

const RATE_LIMIT_CODES = ['over_request_rate_limit', 'over_email_send_rate_limit']

export async function registerUser(email: string, password: string): Promise<RegisterResult> {
  const { data, error } = await createAuthClient().auth.signUp({
    email,
    password,
    // Dit skickas användaren efter att hen klickat på länken i bekräftelsemejlet
    options: { emailRedirectTo: `${env.frontendOrigin}/admin/login` },
  })

  if (error) {
    const code = error.code ?? ''
    if (RATE_LIMIT_CODES.includes(code) || error.status === 429) return { ok: false, reason: 'rate_limited' }
    if (code === 'weak_password') return { ok: false, reason: 'weak_password' }
    // Kontot finns redan, e-posten är ogiltig, registrering är avstängd osv.
    // Vi säger inte exakt vad till användaren, så att ingen kan ta reda på vilka e-postadresser som har konto.
    if (error.status !== undefined && error.status >= 400 && error.status < 500) {
      // Till utvecklaren (terminalen): bara felkod och status. Aldrig e-post eller lösenord.
      console.warn(`Supabase nekade registreringen: code=${code || '(saknas)'} status=${error.status}`)
      return { ok: false, reason: 'cannot_create' }
    }
    throw new Error(`Kunde inte registrera: ${code} ${error.message}`)
  }

  // Ingen session = Supabase väntar på att användaren bekräftar sin e-post
  if (!data.session || !data.user) return { ok: true, needsConfirmation: true }

  return {
    ok: true,
    needsConfirmation: false,
    user: { id: data.user.id, email: data.user.email ?? email },
  }
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password })

  if (error) {
    const code = error.code ?? ''
    if (code === 'invalid_credentials') return { ok: false, reason: 'invalid_credentials' }
    if (code === 'email_not_confirmed') return { ok: false, reason: 'not_confirmed' }
    if (RATE_LIMIT_CODES.includes(code) || error.status === 429) return { ok: false, reason: 'rate_limited' }
    throw new Error(`Kunde inte logga in: ${code} ${error.message}`)
  }

  return { ok: true, user: { id: data.user.id, email: data.user.email ?? email } }
}
