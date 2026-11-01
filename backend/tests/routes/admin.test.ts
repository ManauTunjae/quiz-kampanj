import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { jsonHeaders, sessionCookie } from '../helpers/session-cookie.js'
import { mocked } from '../helpers/mock-services.js'

const ME = { id: '11111111-1111-4111-8111-111111111111', email: 'me@example.com' }
const CAMPAIGN = '22222222-2222-4222-8222-222222222222'
const LEAD = '33333333-3333-4333-8333-333333333333'
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

let cookie: string
beforeEach(async () => {
  cookie = await sessionCookie(ME)
})

const call = (method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: jsonHeaders(cookie),
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  })

const q = (text = 'F') => ({ text, options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] })

describe('ägarskap: den inloggade användarens id skickas alltid till servicen', () => {
  it('lista, skapa', async () => {
    mocked.listCampaigns.mockResolvedValue([])
    mocked.createCampaign.mockResolvedValue({ id: 'c', slug: 's' })
    await call('GET', '/api/admin/campaigns')
    expect(mocked.listCampaigns).toHaveBeenCalledWith(ME.id)
    const res = await call('POST', '/api/admin/campaigns', { title: 'T', questions: [q(), q(), q()] })
    expect(res.status).toBe(201)
    expect(mocked.createCampaign.mock.calls[0][1]).toBe(ME.id)
  })

  it('ägaren kan inte väljas via anropet (ownerId i body avvisas eller ignoreras)', async () => {
    mocked.createCampaign.mockResolvedValue({ id: 'c', slug: 's' })
    await call('POST', '/api/admin/campaigns', { title: 'T', ownerId: 'annan', questions: [q(), q(), q()] })
    expect(mocked.createCampaign.mock.calls[0]?.[1]).toBe(ME.id)
    expect(JSON.stringify(mocked.createCampaign.mock.calls[0]?.[0] ?? {})).not.toContain('annan')
  })

  it('hämta, ändra, radera, statistik, leads, CSV, radera lead', async () => {
    mocked.getCampaignDetail.mockResolvedValue({ id: CAMPAIGN })
    mocked.updateCampaign.mockResolvedValue({ ok: true, campaign: { id: CAMPAIGN } })
    mocked.deleteCampaign.mockResolvedValue(true)
    mocked.getCampaignStats.mockResolvedValue({})
    mocked.listLeads.mockResolvedValue({ leads: [] })
    mocked.exportLeadsCsv.mockResolvedValue({ slug: 's', csv: 'x' })
    mocked.deleteLead.mockResolvedValue(true)

    await call('GET', `/api/admin/campaigns/${CAMPAIGN}`)
    await call('PATCH', `/api/admin/campaigns/${CAMPAIGN}`, { isActive: false })
    await call('DELETE', `/api/admin/campaigns/${CAMPAIGN}`)
    await call('GET', `/api/admin/campaigns/${CAMPAIGN}/stats`)
    await call('GET', `/api/admin/campaigns/${CAMPAIGN}/leads`)
    await call('GET', `/api/admin/campaigns/${CAMPAIGN}/leads.csv`)
    await call('DELETE', `/api/admin/campaigns/${CAMPAIGN}/leads/${LEAD}`)

    expect(mocked.getCampaignDetail).toHaveBeenCalledWith(CAMPAIGN, ME.id)
    expect(mocked.updateCampaign.mock.calls[0].slice(0, 2)).toEqual([CAMPAIGN, ME.id])
    expect(mocked.deleteCampaign).toHaveBeenCalledWith(CAMPAIGN, ME.id)
    expect(mocked.getCampaignStats).toHaveBeenCalledWith(CAMPAIGN, ME.id)
    expect(mocked.listLeads.mock.calls[0].slice(0, 2)).toEqual([CAMPAIGN, ME.id])
    expect(mocked.exportLeadsCsv).toHaveBeenCalledWith(CAMPAIGN, ME.id)
    expect(mocked.deleteLead).toHaveBeenCalledWith(CAMPAIGN, LEAD, ME.id)
  })
})

describe('någon annans kampanj ger 404 (aldrig 403, så att id inte avslöjas)', () => {
  it.each([
    ['GET', `/api/admin/campaigns/${CAMPAIGN}`, 'getCampaignDetail', null],
    ['DELETE', `/api/admin/campaigns/${CAMPAIGN}`, 'deleteCampaign', false],
    ['GET', `/api/admin/campaigns/${CAMPAIGN}/stats`, 'getCampaignStats', null],
    ['GET', `/api/admin/campaigns/${CAMPAIGN}/leads`, 'listLeads', null],
    ['GET', `/api/admin/campaigns/${CAMPAIGN}/leads.csv`, 'exportLeadsCsv', null],
    ['DELETE', `/api/admin/campaigns/${CAMPAIGN}/leads/${LEAD}`, 'deleteLead', false],
  ] as const)('%s %s', async (method, path, service, value) => {
    mocked[service].mockResolvedValue(value)
    expect((await call(method, path)).status).toBe(404)
  })

  it('PATCH', async () => {
    mocked.updateCampaign.mockResolvedValue({ ok: false, reason: 'not_found' })
    expect((await call('PATCH', `/api/admin/campaigns/${CAMPAIGN}`, { isActive: true })).status).toBe(404)
  })
})

describe('id som inte är uuid ger 404 utan att fråga databasen', () => {
  it.each([
    ['GET', '/api/admin/campaigns/abc'],
    ['DELETE', '/api/admin/campaigns/abc'],
    ['GET', '/api/admin/campaigns/abc/stats'],
    ['GET', '/api/admin/campaigns/abc/leads.csv'],
    ['DELETE', `/api/admin/campaigns/${CAMPAIGN}/leads/abc`],
  ])('%s %s', async (method, path) => {
    expect((await call(method, path)).status).toBe(404)
    for (const fn of Object.values(mocked)) expect(fn).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/admin/campaigns/:id', () => {
  it('200 med den ändrade kampanjen', async () => {
    mocked.updateCampaign.mockResolvedValue({ ok: true, campaign: { id: CAMPAIGN, isActive: false } })
    const res = await call('PATCH', `/api/admin/campaigns/${CAMPAIGN}`, { isActive: false })
    expect(res.status).toBe(200)
    expect((await res.json()).campaign.isActive).toBe(false)
  })

  it('400 när strukturen inte stämmer (structure_mismatch)', async () => {
    mocked.updateCampaign.mockResolvedValue({ ok: false, reason: 'structure_mismatch' })
    expect((await call('PATCH', `/api/admin/campaigns/${CAMPAIGN}`, { title: 'Ny' })).status).toBe(400)
  })

  it.each([{}, { slug: 'ny' }, { title: 'Ny', isCorrect: true }, { accentColor: 'rosa' }])('400 för ogiltig body %j', async (body) => {
    const res = await call('PATCH', `/api/admin/campaigns/${CAMPAIGN}`, body)
    expect(res.status).toBe(400)
    expect(mocked.updateCampaign).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/campaigns', () => {
  it('400 med lista över fel när titel saknas', async () => {
    const res = await call('POST', '/api/admin/campaigns', { questions: [q(), q(), q()] })
    expect(res.status).toBe(400)
    expect((await res.json()).issues.some((i: { path: string }) => i.path === 'title')).toBe(true)
  })
})

describe('personuppgifter lagras inte i cache', () => {
  it('leads, statistik och detaljer har no-store', async () => {
    mocked.listLeads.mockResolvedValue({ leads: [] })
    mocked.getCampaignStats.mockResolvedValue({})
    mocked.getCampaignDetail.mockResolvedValue({ id: CAMPAIGN })
    for (const path of [`/${CAMPAIGN}/leads`, `/${CAMPAIGN}/stats`, `/${CAMPAIGN}`]) {
      const res = await call('GET', `/api/admin/campaigns${path}`)
      expect(res.headers.get('cache-control'), path).toBe('no-store')
    }
  })
})

describe('GET leads (query)', () => {
  it('400 för limit som är för stor eller negativ offset', async () => {
    const a = await call('GET', `/api/admin/campaigns/${CAMPAIGN}/leads?limit=100000`)
    const b = await call('GET', `/api/admin/campaigns/${CAMPAIGN}/leads?offset=-1`)
    expect([a.status, b.status]).toEqual([400, 400])
  })
})

describe('CSV-export', () => {
  it('rätt rubriker: filnamn, typ och no-store', async () => {
    mocked.exportLeadsCsv.mockResolvedValue({ slug: 'mitt-quiz', csv: 'Namn;E-post\r\n' })
    const res = await call('GET', `/api/admin/campaigns/${CAMPAIGN}/leads.csv`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="leads-mitt-quiz-\d{4}-\d{2}-\d{2}\.csv"$/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('Namn;E-post\r\n')
  })

  it('429 efter 10 exporter per användare, men inte för en annan användare', async () => {
    mocked.exportLeadsCsv.mockResolvedValue({ slug: 's', csv: 'x' })
    // Egna användare, eftersom spärren minns tidigare anrop i den här filen
    const heavy = await sessionCookie({ id: '88888888-8888-4888-8888-888888888888', email: 'h@example.com' })
    const other = await sessionCookie({ id: '99999999-9999-4999-8999-999999999999', email: 'o@example.com' })
    const path = `/api/admin/campaigns/${CAMPAIGN}/leads.csv`
    const get = (c: string) => app.request(path, { headers: jsonHeaders(c) })
    for (let i = 0; i < 10; i++) expect((await get(heavy)).status).toBe(200)
    const blocked = await get(heavy)
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    const res = await app.request(path, { headers: jsonHeaders(other) })
    expect(res.status).toBe(200)
  })
})

describe('uuid-hjälpare', () => {
  it('är giltiga uuid (sanity)', () => {
    expect(uuid(1)).toMatch(/^[0-9a-f-]{36}$/)
  })
})
