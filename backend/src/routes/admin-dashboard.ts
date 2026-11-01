import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import type { AuthEnv } from '../middleware/require-user.js'
import { getCampaignStats, listLeads } from '../services/dashboard-service.js'
import { deleteLead } from '../services/delete-service.js'
import { exportLeadsCsv } from '../services/export-service.js'
import { createRateLimiter } from '../lib/rate-limit.js'
import { campaignIdParamSchema, leadParamSchema, leadsQuerySchema } from '../validation/dashboard.js'
import { onInvalid } from '../validation/hook.js'

// Skyddad av requireAdmin (se index.ts). Monteras på /api/admin.
export const adminDashboard = new Hono<AuthEnv>()

// Max 10 exporter per 10 minuter och inloggad användare (en export hämtar alla personuppgifter)
const exportLimiter = createRateLimiter({ max: 10, windowMs: 10 * 60 * 1000 })

// Ett id som inte är ett riktigt uuid kan inte finnas → 404
const idHook = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json({ error: 'Kampanjen finns inte' }, 404)
}

// GET /api/admin/campaigns/:id/stats → deltagare, leads, svar per fråga
adminDashboard.get('/campaigns/:id/stats', zValidator('param', campaignIdParamSchema, idHook), async (c) => {
  const stats = await getCampaignStats(c.req.valid('param').id, c.get('user').id)
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
    const result = await listLeads(c.req.valid('param').id, c.get('user').id, limit, offset)
    if (!result) return c.json({ error: 'Kampanjen finns inte' }, 404)
    // Personuppgifter ska inte sparas i någon cache
    c.header('Cache-Control', 'no-store')
    return c.json(result)
  }
)

// DELETE /api/admin/campaigns/:id/leads/:leadId → raderar en persons namn och e-post (GDPR)
adminDashboard.delete(
  '/campaigns/:id/leads/:leadId',
  zValidator('param', leadParamSchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Leaden finns inte' }, 404)
  }),
  async (c) => {
    const { id, leadId } = c.req.valid('param')
    const deleted = await deleteLead(id, leadId, c.get('user').id)
    if (!deleted) return c.json({ error: 'Leaden finns inte' }, 404)
    return c.json({ ok: true })
  }
)

// GET /api/admin/campaigns/:id/leads.csv → CSV-fil med alla leads (personuppgifter!)
adminDashboard.get('/campaigns/:id/leads.csv', zValidator('param', campaignIdParamSchema, idHook), async (c) => {
  const user = c.get('user')
  const wait = exportLimiter(user.id)
  if (wait > 0) {
    c.header('Retry-After', String(wait))
    return c.json({ error: 'För många exporter. Vänta en stund.' }, 429)
  }

  const result = await exportLeadsCsv(c.req.valid('param').id, user.id)
  if (!result) return c.json({ error: 'Kampanjen finns inte' }, 404)

  const day = new Date().toISOString().slice(0, 10)
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="leads-${result.slug}-${day}.csv"`)
  // Personuppgifter ska inte sparas i någon cache
  c.header('Cache-Control', 'no-store')
  return c.body(result.csv)
})
