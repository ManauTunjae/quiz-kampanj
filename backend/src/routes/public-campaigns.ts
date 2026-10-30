import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { getPublicCampaign } from '../services/public-campaign-service.js'
import { slugParamSchema } from '../validation/slug.js'

// Publika routes: ingen inloggning. Monteras på /api (se index.ts).
export const publicCampaigns = new Hono()

// GET /api/campaigns/:slug → kampanj med frågor och alternativ (utan rätt svar)
publicCampaigns.get(
  '/campaigns/:slug',
  // En länk med konstiga tecken kan inte finnas, så vi svarar 404 i stället för 400.
  zValidator('param', slugParamSchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Kampanjen finns inte' }, 404)
  }),
  async (c) => {
    const { slug } = c.req.valid('param')
    const campaign = await getPublicCampaign(slug)
    if (!campaign) return c.json({ error: 'Kampanjen finns inte' }, 404)
    return c.json({ campaign })
  }
)
