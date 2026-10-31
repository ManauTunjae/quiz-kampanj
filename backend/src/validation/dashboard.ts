import { z } from 'zod'

// /api/admin/campaigns/:id/...
export const campaignIdParamSchema = z.object({ id: z.uuid() })

// /api/admin/campaigns/:id/leads?limit=100&offset=0
export const leadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})
