import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import { getCampaignStats, listLeads } from '../services/dashboard-service.js'
import { campaignIdParamSchema, leadsQuerySchema } from '../validation/dashboard.js'
import { onInvalid } from '../validation/hook.js'

// Skyddad av requireAdmin (se index.ts). Monteras på /api/admin.
export const adminDashboard = new Hono()

// Ett id som inte är ett riktigt uuid kan inte finnas → 404
const idHook = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json({ error: 'Kampanjen finns inte' }, 404)
}

// GET /api/admin/campaigns/:id/stats → deltagare, leads, svar per fråga
adminDashboard.get('/campaigns/:id/stats', zValidator('param', campaignIdParamSchema, idHook), async (c) => {
  const stats = await getCampaignStats(c.req.valid('param').id)
  if (!stats) return c.json({ error: 'Kampanjen finns inte' }, 404)
  c.header('Cache-Control', 'no-store')
  return c.json(stats)
})

// GET /api/admin/campaigns/:id/leads?limit=100&offset=0 → lista med leads (personuppgifter!)
adminDashboard.get(
  '/campaigns/:id/leads',
  zValidator('param', campaignIdParamSchema, idHook),
  zValidator('query', leadsQuerySchema, onInvalid),
  async (c) => {
    const { limit, offset } = c.req.valid('query')
    const result = await listLeads(c.req.valid('param').id, limit, offset)
    if (!result) return c.json({ error: 'Kampanjen finns inte' }, 404)
    // Personuppgifter ska inte sparas i någon cache
    c.header('Cache-Control', 'no-store')
    return c.json(result)
  }
)
