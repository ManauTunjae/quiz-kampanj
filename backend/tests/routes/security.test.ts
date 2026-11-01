import { describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { jsonHeaders, sessionCookie } from '../helpers/session-cookie.js'
import { mocked } from '../helpers/mock-services.js'

const ID = '22222222-2222-4222-8222-222222222222'
const LEAD = '33333333-3333-4333-8333-333333333333'

// Alla skyddade adresser i appen. Lägger du till en ny admin-route: lägg till den här också.
const adminRoutes: [string, string][] = [
  ['GET', '/api/admin/campaigns'],
  ['POST', '/api/admin/campaigns'],
  ['GET', `/api/admin/campaigns/${ID}`],
  ['PATCH', `/api/admin/campaigns/${ID}`],
  ['DELETE', `/api/admin/campaigns/${ID}`],
  ['GET', `/api/admin/campaigns/${ID}/stats`],
  ['GET', `/api/admin/campaigns/${ID}/leads`],
  ['GET', `/api/admin/campaigns/${ID}/leads.csv`],
  ['DELETE', `/api/admin/campaigns/${ID}/leads/${LEAD}`],
]

describe('admin-routes kräver inloggning', () => {
  it.each(adminRoutes)('%s %s → 401 utan cookie', async (method, path) => {
    const res = await app.request(path, { method, headers: jsonHeaders(), body: method === 'GET' ? undefined : '{}' })
    expect(res.status).toBe(401)
  })

  it('ingen service anropas när man inte är inloggad', async () => {
    for (const [method, path] of adminRoutes) {
      await app.request(path, { method, headers: jsonHeaders(), body: method === 'GET' ? undefined : '{}' })
    }
    for (const fn of Object.values(mocked)) expect(fn).not.toHaveBeenCalled()
  })

  it('avvisar en förfalskad cookie (fel signatur)', async () => {
    const good = await sessionCookie()
    const forged = good.replace(/\.[^.]+$/, '.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA%3D')
    const res = await app.request('/api/admin/campaigns', { headers: jsonHeaders(forged) })
    expect(res.status).toBe(401)
  })

  it('avvisar en cookie som är äldre än 8 timmar', async () => {
    const old = await sessionCookie(undefined, Date.now() - 8 * 60 * 60 * 1000 - 1000)
    const res = await app.request('/api/admin/campaigns', { headers: jsonHeaders(old) })
    expect(res.status).toBe(401)
  })

  it('släpper in med giltig cookie', async () => {
    mocked.listCampaigns.mockResolvedValue([])
    const res = await app.request('/api/admin/campaigns', { headers: jsonHeaders(await sessionCookie()) })
    expect(res.status).toBe(200)
  })
})

describe('csrf-skydd', () => {
  it('ger 403 för POST utan JSON och utan rätt Origin (som i Postman utan Body)', async () => {
    const res = await app.request('/auth/logout', { method: 'POST' })
    expect(res.status).toBe(403)
  })

  it('ger 403 för ett vanligt formulär (form-post) från en annan webbplats', async () => {
    const res = await app.request('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://ond.example' },
      body: 'a=b',
    })
    expect(res.status).toBe(403)
  })

  it('JSON från en annan webbplats stoppas av CORS, inte av csrf (webbläsaren gör först en preflight)', async () => {
    const preflight = await app.request('/auth/logout', {
      method: 'OPTIONS',
      headers: { Origin: 'https://ond.example', 'Access-Control-Request-Method': 'POST' },
    })
    expect(preflight.headers.get('access-control-allow-origin')).not.toBe('https://ond.example')
  })

  it('släpper igenom anrop från vårt frontend', async () => {
    const res = await app.request('/auth/logout', { method: 'POST', headers: jsonHeaders(), body: '{}' })
    expect(res.status).toBe(200)
  })
})

describe('cors', () => {
  it('tillåter bara vårt frontend och tillåter cookies', async () => {
    const res = await app.request('/health', { headers: { Origin: 'http://localhost:3000' } })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('ger inte ut Access-Control-Allow-Origin till en annan webbplats', async () => {
    const res = await app.request('/health', { headers: { Origin: 'https://ond.example' } })
    expect(res.headers.get('access-control-allow-origin')).not.toBe('https://ond.example')
    expect(res.headers.get('access-control-allow-origin')).not.toBe('*')
  })

  it('svarar på preflight (OPTIONS) för DELETE och PATCH', async () => {
    const res = await app.request('/api/admin/campaigns/x', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'DELETE' },
    })
    expect(res.status).toBe(204)
    const methods = res.headers.get('access-control-allow-methods') ?? ''
    expect(methods).toContain('DELETE')
    expect(methods).toContain('PATCH')
  })

  it('visar Content-Disposition för frontend (CSV-nedladdning)', async () => {
    const res = await app.request('/health', { headers: { Origin: 'http://localhost:3000' } })
    expect(res.headers.get('access-control-expose-headers')).toContain('Content-Disposition')
  })
})

describe('onError', () => {
  it('visar inte detaljer vid oväntat fel (500)', async () => {
    mocked.listCampaigns.mockRejectedValue(new Error('hemlig databasdetalj: password=abc'))
    const res = await app.request('/api/admin/campaigns', { headers: jsonHeaders(await sessionCookie()) })
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain('hemlig')
    expect(JSON.parse(text)).toEqual({ error: 'Något gick fel på servern' })
  })
})
