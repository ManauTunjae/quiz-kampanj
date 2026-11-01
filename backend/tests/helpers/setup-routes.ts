// Läses in före alla route-tester (se setupFiles i vitest.config.ts).
// Byter ut services och IP-funktionen så att inget når en riktig databas.
import { beforeEach, vi } from 'vitest'
import { mocked } from './mock-services.js'

// vi.mock körs före import, därför hämtar varje fabrik låtsasfunktionerna med import().
const m = () => import('./mock-services.js').then((x) => x.mocked)

vi.mock('../../src/services/campaign-service.js', async () => {
  const k = await m()
  return { createCampaign: k.createCampaign, listCampaigns: k.listCampaigns }
})
vi.mock('../../src/services/campaign-edit-service.js', async () => {
  const k = await m()
  return { getCampaignDetail: k.getCampaignDetail, updateCampaign: k.updateCampaign }
})
vi.mock('../../src/services/delete-service.js', async () => {
  const k = await m()
  return { deleteCampaign: k.deleteCampaign, deleteLead: k.deleteLead }
})
vi.mock('../../src/services/dashboard-service.js', async () => {
  const k = await m()
  return { getCampaignStats: k.getCampaignStats, listLeads: k.listLeads }
})
vi.mock('../../src/services/export-service.js', async () => ({ exportLeadsCsv: (await m()).exportLeadsCsv }))
vi.mock('../../src/services/public-campaign-service.js', async () => ({
  getPublicCampaign: (await m()).getPublicCampaign,
}))
vi.mock('../../src/services/submission-service.js', async () => ({ submitAnswers: (await m()).submitAnswers }))
vi.mock('../../src/services/lead-service.js', async () => ({ saveLead: (await m()).saveLead }))
vi.mock('../../src/services/auth-service.js', async () => {
  const k = await m()
  return {
    registerUser: k.registerUser,
    loginUser: k.loginUser,
    requestPasswordReset: k.requestPasswordReset,
    resetPassword: k.resetPassword,
    confirmEmail: k.confirmEmail,
    resendConfirmation: k.resendConfirmation,
  }
})
// Utan riktig server finns ingen IP-adress. Testet väljer en själv med rubriken X-Test-Ip,
// så att spärrarna (som räknar per IP) inte påverkar varandra mellan tester.
vi.mock('../../src/lib/client-key.js', () => ({
  clientKey: (c: { req: { header: (n: string) => string | undefined } }) => c.req.header('x-test-ip') ?? 'test-ip',
}))

beforeEach(() => {
  for (const fn of Object.values(mocked)) fn.mockReset()
})
