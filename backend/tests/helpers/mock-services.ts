import { vi } from 'vitest'

// Låtsasfunktioner som ersätter services i route-testerna (se setup-routes.ts).
// Så testar vi routen (validering, inloggning, svarskoder) utan databas.
const fn = () => vi.fn()

export const mocked = {
  createCampaign: fn(),
  listCampaigns: fn(),
  getCampaignDetail: fn(),
  updateCampaign: fn(),
  deleteCampaign: fn(),
  deleteLead: fn(),
  getCampaignStats: fn(),
  listLeads: fn(),
  exportLeadsCsv: fn(),
  getPublicCampaign: fn(),
  submitAnswers: fn(),
  saveLead: fn(),
  registerUser: fn(),
  loginUser: fn(),
  requestPasswordReset: fn(),
  resetPassword: fn(),
  confirmEmail: fn(),
  resendConfirmation: fn(),
}
