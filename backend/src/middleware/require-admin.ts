import { createMiddleware } from 'hono/factory'
import { isAdmin } from '../lib/session.js'

// Skyddar admin-routes: utan giltig cookie får man 401.
export const requireAdmin = createMiddleware(async (c, next) => {
  if (!(await isAdmin(c))) {
    return c.json({ error: 'Inte inloggad' }, 401)
  }
  await next()
})
