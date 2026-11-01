import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import type { AuthEnv } from '../middleware/require-user.js'
import { createCampaign, listCampaigns } from '../services/campaign-service.js'
import { getCampaignDetail, updateCampaign } from '../services/campaign-edit-service.js'
import { createCampaignSchema, updateCampaignSchema } from '../validation/campaign.js'
import { campaignIdParamSchema } from '../validation/dashboard.js'
import { deleteCampaign } from '../services/delete-service.js'
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

// Ett id som inte är ett riktigt uuid kan inte finnas → 404
const idHook = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json({ error: 'Kampanjen finns inte' }, 404)
}

// DELETE /api/admin/campaigns/:id → raderar kampanjen och ALLT som hör till den (frågor, deltagare, leads)
adminCampaigns.delete('/campaigns/:id', zValidator('param', campaignIdParamSchema, idHook), async (c) => {
  const deleted = await deleteCampaign(c.req.valid('param').id, c.get('user').id)
  if (!deleted) return c.json({ error: 'Kampanjen finns inte' }, 404)
  return c.json({ ok: true })
})

// GET /api/admin/campaigns/:id → hela kampanjen med rätt svar (för redigeringsformuläret)
adminCampaigns.get('/campaigns/:id', zValidator('param', campaignIdParamSchema, idHook), async (c) => {
  const campaign = await getCampaignDetail(c.req.valid('param').id, c.get('user').id)
  if (!campaign) return c.json({ error: 'Kampanjen finns inte' }, 404)
  c.header('Cache-Control', 'no-store')
  return c.json({ campaign })
})

// PATCH /api/admin/campaigns/:id → ändra titel, färg, pausad/aktiv och texter
adminCampaigns.patch(
  '/campaigns/:id',
  zValidator('param', campaignIdParamSchema, idHook),
  zValidator('json', updateCampaignSchema, onInvalid),
  async (c) => {
    const result = await updateCampaign(c.req.valid('param').id, c.get('user').id, c.req.valid('json'))
    if (!result.ok) {
      return result.reason === 'not_found'
        ? c.json({ error: 'Kampanjen finns inte' }, 404)
        : c.json({ error: 'Frågorna stämmer inte med kampanjen. Ladda om sidan och försök igen.' }, 400)
    }
    return c.json({ campaign: result.campaign })
  }
)
