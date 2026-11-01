import { createMiddleware } from 'hono/factory'
import { getSessionUser, type SessionUser } from '../lib/session.js'

// Typ för Hono: efter den här middleware finns c.get('user') i routes.
export type AuthEnv = { Variables: { user: SessionUser } }

// Skyddar routes: utan giltig cookie får man 401.
export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: 'Inte inloggad' }, 401)
  c.set('user', user)
  await next()
})
