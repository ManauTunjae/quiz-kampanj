import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { env } from '../config/env.js'
import { clientKey } from '../lib/client-key.js'
import { clearFails, registerFail, secondsLeftIfBlocked } from '../lib/login-limiter.js'
import { endSession, isAdmin, startSession } from '../lib/session.js'
import { samePassword } from '../utils/password.js'
import { loginSchema } from '../validation/auth.js'
import { onInvalid } from '../validation/hook.js'

// Öppna routes: /auth/login, /auth/logout, /auth/me
export const authRoutes = new Hono()

authRoutes.post('/login', zValidator('json', loginSchema, onInvalid), async (c) => {
  const key = clientKey(c)

  const wait = secondsLeftIfBlocked(key)
  if (wait > 0) {
    c.header('Retry-After', String(wait))
    return c.json({ error: 'För många försök. Vänta en stund.' }, 429)
  }

  const { password } = c.req.valid('json')
  if (!samePassword(password, env.adminPassword)) {
    registerFail(key)
    return c.json({ error: 'Fel lösenord' }, 401)
  }

  clearFails(key)
  await startSession(c)
  return c.json({ ok: true })
})

authRoutes.post('/logout', (c) => {
  endSession(c)
  return c.json({ ok: true })
})

// Frontend använder den här för att veta om man är inloggad.
authRoutes.get('/me', async (c) => c.json({ loggedIn: await isAdmin(c) }))
