import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/require-user.js'
import { createCampaign, listCampaigns } from '../services/campaign-service.js'
import { createCampaignSchema } from '../validation/campaign.js'
import { onInvalid } from '../validation/hook.js'

// Alla routes här är skyddade av requireAdmin (se index.ts).
// Routes ska vara tunna: ta emot, validera, anropa en service, svara.
export const adminCampaigns = new Hono<AuthEnv>()

adminCampaigns.get('/campaigns', async (c) => {
  const campaigns = await listCampaigns(c.get('user').id)
  return c.json({ campaigns })
})

adminCampaigns.post(
  '/campaigns',
  zValidator('json', createCampaignSchema, onInvalid),
  async (c) => {
    const campaign = await createCampaign(c.req.valid('json'), c.get('user').id)
    return c.json(campaign, 201)
  }
)
