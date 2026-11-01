import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { clientKey } from '../lib/client-key.js'
import { clearFails, registerFail, secondsLeftIfBlocked } from '../lib/login-limiter.js'
import { createRateLimiter } from '../lib/rate-limit.js'
import { endSession, getSessionUser, startSession } from '../lib/session.js'
import { loginUser, registerUser } from '../services/auth-service.js'
import { loginSchema, registerSchema } from '../validation/auth.js'
import { onInvalid } from '../validation/hook.js'

// Öppna routes: /auth/register, /auth/login, /auth/logout, /auth/me
export const authRoutes = new Hono()

// Max 10 nya konton per timme och IP-adress
const registerLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 })

// Vår egen spärr (per IP-adress)
const TOO_MANY = { error: 'För många försök. Vänta en stund.' }
// Supabase har sin egen spärr (t.ex. många konton eller mejl på kort tid)
const SUPABASE_BUSY = {
  error: 'Inloggningstjänsten (Supabase) tar emot för många förfrågningar just nu. Vänta några minuter och försök igen.',
}

authRoutes.post('/register', zValidator('json', registerSchema, onInvalid), async (c) => {
  const wait = registerLimiter(clientKey(c))
  if (wait > 0) {
    c.header('Retry-After', String(wait))
    return c.json(TOO_MANY, 429)
  }

  const { email, password } = c.req.valid('json')
  const result = await registerUser(email, password)

  if (!result.ok) {
    if (result.reason === 'rate_limited') return c.json(SUPABASE_BUSY, 429)
    if (result.reason === 'weak_password') {
      return c.json({ error: 'Lösenordet är för svagt. Välj ett längre eller mer ovanligt lösenord.' }, 400)
    }
    return c.json({ error: 'Det gick inte att skapa kontot. Har du redan ett konto? Prova att logga in.' }, 400)
  }

  // Bekräftelse av e-post är på: användaren måste klicka på länken i mejlet först
  if (result.needsConfirmation) return c.json({ needsConfirmation: true }, 201)

  await startSession(c, result.user)
  return c.json({ needsConfirmation: false, user: result.user }, 201)
})

authRoutes.post('/login', zValidator('json', loginSchema, onInvalid), async (c) => {
  const key = clientKey(c)

  const wait = secondsLeftIfBlocked(key)
  if (wait > 0) {
    c.header('Retry-After', String(wait))
    return c.json(TOO_MANY, 429)
  }

  const { email, password } = c.req.valid('json')
  const result = await loginUser(email, password)

  if (!result.ok) {
    if (result.reason === 'rate_limited') return c.json(SUPABASE_BUSY, 429)
    if (result.reason === 'not_confirmed') {
      return c.json({ error: 'Bekräfta din e-postadress först. Titta efter mejlet från oss.' }, 403)
    }
    registerFail(key)
    // Samma svar oavsett om e-posten finns eller inte
    return c.json({ error: 'Fel e-post eller lösenord' }, 401)
  }

  clearFails(key)
  await startSession(c, result.user)
  return c.json({ ok: true, user: result.user })
})

authRoutes.post('/logout', (c) => {
  endSession(c)
  return c.json({ ok: true })
})

// Frontend använder den här för att veta om man är inloggad (och vem).
authRoutes.get('/me', async (c) => {
  const user = await getSessionUser(c)
  return user ? c.json({ loggedIn: true, user }) : c.json({ loggedIn: false })
})
