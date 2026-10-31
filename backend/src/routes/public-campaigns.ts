import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import { clientKey } from '../lib/client-key.js'
import { createRateLimiter } from '../lib/rate-limit.js'
import { getPublicCampaign } from '../services/public-campaign-service.js'
import { submitAnswers } from '../services/submission-service.js'
import { onInvalid } from '../validation/hook.js'
import { slugParamSchema } from '../validation/slug.js'
import { submitAnswersSchema } from '../validation/submission.js'

// Publika routes: ingen inloggning. Monteras på /api (se index.ts).
export const publicCampaigns = new Hono()

// En länk med konstiga tecken kan inte finnas, så vi svarar 404 i stället för 400.
const slugHook = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json({ error: 'Kampanjen finns inte' }, 404)
}

// Max 60 inskickade quiz per 10 minuter och IP-adress (skydd mot spam i statistiken).
// Generöst, eftersom många på samma event kan dela en och samma IP.
const submissionLimiter = createRateLimiter({ max: 60, windowMs: 10 * 60 * 1000 })

// GET /api/campaigns/:slug → kampanj med frågor och alternativ (utan rätt svar)
publicCampaigns.get('/campaigns/:slug', zValidator('param', slugParamSchema, slugHook), async (c) => {
  const { slug } = c.req.valid('param')
  const campaign = await getPublicCampaign(slug)
  if (!campaign) return c.json({ error: 'Kampanjen finns inte' }, 404)
  return c.json({ campaign })
})

// POST /api/campaigns/:slug/submissions → skicka in alla svar, få poängen tillbaka
publicCampaigns.post(
  '/campaigns/:slug/submissions',
  zValidator('param', slugParamSchema, slugHook),
  zValidator('json', submitAnswersSchema, onInvalid),
  async (c) => {
    const wait = submissionLimiter(clientKey(c))
    if (wait > 0) {
      c.header('Retry-After', String(wait))
      return c.json({ error: 'För många försök. Vänta en stund.' }, 429)
    }

    const { slug } = c.req.valid('param')
    const { answers } = c.req.valid('json')
    const result = await submitAnswers(slug, answers)

    if (!result.ok) {
      return result.reason === 'not_found'
        ? c.json({ error: 'Kampanjen finns inte' }, 404)
        : c.json({ error: 'Svaren stämmer inte med kampanjen' }, 400)
    }

    return c.json({ submissionId: result.submissionId, score: result.score, total: result.total }, 201)
  }
)
