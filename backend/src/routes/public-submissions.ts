import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { clientKey } from '../lib/client-key.js'
import { createRateLimiter } from '../lib/rate-limit.js'
import { saveLead } from '../services/lead-service.js'
import { onInvalid } from '../validation/hook.js'
import { leadSchema, submissionParamSchema } from '../validation/lead.js'

// Publika routes för en deltagare (ingen inloggning). Monteras på /api (se index.ts).
export const publicSubmissions = new Hono()

// Max 30 sparade leads per 10 minuter och IP-adress (skydd mot spam).
const leadLimiter = createRateLimiter({ max: 30, windowMs: 10 * 60 * 1000 })

// POST /api/submissions/:id/lead → spara namn, e-post och samtycke
publicSubmissions.post(
  '/submissions/:id/lead',
  zValidator('param', submissionParamSchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Deltagaren finns inte' }, 404)
  }),
  zValidator('json', leadSchema, onInvalid),
  async (c) => {
    const wait = leadLimiter(clientKey(c))
    if (wait > 0) {
      c.header('Retry-After', String(wait))
      return c.json({ error: 'För många försök. Vänta en stund.' }, 429)
    }

    const { id } = c.req.valid('param')
    const result = await saveLead(id, c.req.valid('json'))

    if (!result.ok) {
      return result.reason === 'not_found'
        ? c.json({ error: 'Deltagaren finns inte' }, 404)
        : c.json({ error: 'Dina uppgifter är redan sparade' }, 409)
    }

    // Vi skickar aldrig tillbaka personuppgifterna.
    return c.json({ ok: true }, 201)
  }
)
