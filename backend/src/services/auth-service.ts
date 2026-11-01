import { createAuthClient } from '../database/supabase-auth.js'
import { supabase } from '../database/supabase.js'
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
    options: { emailRedirectTo: `${env.frontendOrigin}/admin/confirm` },
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

// ---------------------------------------------------------------
// Glömt lösenord och e-postbekräftelse
//
// Mejlen skickas av Supabase med Supabases standardmall. Länken i mejlet går först till Supabase,
// som kontrollerar engångskoden och sedan skickar användaren till VÅR frontend med en
// åtkomstnyckel (access_token) i adressen efter #. Frontend skickar nyckeln hit.
// Vi kontrollerar nyckeln hos Supabase och avslutar sedan Supabase-sessionen,
// så nyckeln inte kan användas igen.
// ---------------------------------------------------------------

function isRateLimited(error: { code?: string; status?: number }) {
  return RATE_LIMIT_CODES.includes(error.code ?? '') || error.status === 429
}

const isClientError = (error: { status?: number }) =>
  error.status !== undefined && error.status >= 400 && error.status < 500

export type SimpleResult = { ok: true } | { ok: false; reason: 'rate_limited' }

type TokenUser =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: 'invalid_link' | 'rate_limited' }

// Vem hör åtkomstnyckeln till? Supabase avgör om den är äkta och fortfarande giltig.
async function userFromAccessToken(accessToken: string): Promise<TokenUser> {
  const { data, error } = await createAuthClient().auth.getUser(accessToken)
  if (error) {
    if (isRateLimited(error)) return { ok: false, reason: 'rate_limited' }
    if (isClientError(error)) return { ok: false, reason: 'invalid_link' } // falsk, utgången eller redan använd
    throw new Error(`Kunde inte kontrollera länken: ${error.code ?? ''} ${error.message}`)
  }
  if (!data.user) return { ok: false, reason: 'invalid_link' }
  return { ok: true, user: { id: data.user.id, email: data.user.email ?? '' } }
}

// Avslutar alla Supabase-sessioner för användaren. Då slutar åtkomstnyckeln fungera (engångsnyckel).
// Vi använder inga Supabase-sessioner själva (vi har vår egen cookie), så inget går förlorat.
async function endSupabaseSessions(accessToken: string) {
  const { error } = await supabase.auth.admin.signOut(accessToken, 'global')
  if (error) console.warn(`Kunde inte avsluta Supabase-sessionen: code=${error.code ?? '(saknas)'} status=${error.status ?? '?'}`)
}

// Skickar mejl med återställningslänk. Svaret är ALLTID ok, även om e-posten inte har något konto,
// så att ingen kan ta reda på vilka e-postadresser som har konto.
export async function requestPasswordReset(email: string): Promise<SimpleResult> {
  const { error } = await createAuthClient().auth.resetPasswordForEmail(email, {
    // Hit skickas användaren efter Supabases kontroll. Adressen måste stå under Redirect URLs i Supabase.
    redirectTo: `${env.frontendOrigin}/admin/reset-password`,
  })
  if (!error) return { ok: true }
  if (isRateLimited(error)) return { ok: false, reason: 'rate_limited' }
  if (isClientError(error)) {
    console.warn(`Supabase nekade återställningsmejl: code=${error.code ?? '(saknas)'} status=${error.status}`)
    return { ok: true } // säg inget om vad som gick fel
  }
  throw new Error(`Kunde inte skicka återställningsmejl: ${error.code ?? ''} ${error.message}`)
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_link' | 'weak_password' | 'rate_limited' }

// Byter lösenord. accessToken kommer från länken i mejlet.
export async function resetPassword(accessToken: string, password: string): Promise<ResetResult> {
  const who = await userFromAccessToken(accessToken)
  if (!who.ok) return who

  // Det nya lösenordet sätts med den hemliga nyckeln (bara här i backend)
  const { error } = await supabase.auth.admin.updateUserById(who.user.id, { password })
  if (error) {
    if (error.code === 'weak_password') return { ok: false, reason: 'weak_password' }
    throw new Error(`Kunde inte byta lösenord: ${error.code ?? ''} ${error.message}`)
  }

  await endSupabaseSessions(accessToken)
  return { ok: true }
}

export type ConfirmResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: 'invalid_link' | 'rate_limited' }

// Bekräftar e-postadressen efter registrering. Lyckas det är användaren inloggad direkt.
// (Supabase har redan bekräftat adressen när länken i mejlet öppnades.)
export async function confirmEmail(accessToken: string): Promise<ConfirmResult> {
  const who = await userFromAccessToken(accessToken)
  if (!who.ok) return who
  await endSupabaseSessions(accessToken)
  return who
}

// Skickar bekräftelsemejlet igen. Svaret är alltid ok (samma skäl som ovan).
export async function resendConfirmation(email: string): Promise<SimpleResult> {
  const { error } = await createAuthClient().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${env.frontendOrigin}/admin/confirm` },
  })
  if (!error) return { ok: true }
  if (isRateLimited(error)) return { ok: false, reason: 'rate_limited' }
  if (isClientError(error)) {
    console.warn(`Supabase nekade nytt bekräftelsemejl: code=${error.code ?? '(saknas)'} status=${error.status}`)
    return { ok: true }
  }
  throw new Error(`Kunde inte skicka bekräftelsemejl: ${error.code ?? ''} ${error.message}`)
}
