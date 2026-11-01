import { describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { jsonHeaders, sessionCookie } from '../helpers/session-cookie.js'
import { mocked } from '../helpers/mock-services.js'

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'anna@example.com' }
const JWT = `${'a'.repeat(12)}.${'b'.repeat(12)}.${'c'.repeat(12)}`
// Varje test får en egen IP-adress, så att spärrarna inte stör varandra
let n = 0
const post = (path: string, body: unknown, ip = `auth-ip-${++n}`) =>
  app.request(path, { method: 'POST', headers: { ...jsonHeaders(), 'X-Test-Ip': ip }, body: JSON.stringify(body) })

describe('POST /auth/login', () => {
  it('200, sätter en httpOnly-cookie med SameSite=Lax', async () => {
    mocked.loginUser.mockResolvedValue({ ok: true, user: USER })
    const res = await post('/auth/login', { email: 'ANNA@example.com ', password: 'hemligt123' })
    expect(res.status).toBe(200)
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('qb_session=')
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Max-Age=28800/i)
    expect(mocked.loginUser).toHaveBeenCalledWith('anna@example.com', 'hemligt123')
  })

  it('lösenordet finns aldrig i svaret eller i cookien', async () => {
    mocked.loginUser.mockResolvedValue({ ok: true, user: USER })
    const res = await post('/auth/login', { email: USER.email, password: 'hemligt123' })
    expect(await res.text()).not.toContain('hemligt123')
    expect(decodeURIComponent(res.headers.get('set-cookie') ?? '')).not.toContain('hemligt123')
  })

  it('401 med samma text oavsett varför inloggningen misslyckades', async () => {
    mocked.loginUser.mockResolvedValue({ ok: false, reason: 'invalid_credentials' })
    const a = await post('/auth/login', { email: 'finns@example.com', password: 'fel' })
    mocked.loginUser.mockResolvedValue({ ok: false, reason: 'unknown' })
    const b = await post('/auth/login', { email: 'finns-inte@example.com', password: 'fel' })
    expect([a.status, b.status]).toEqual([401, 401])
    expect(await a.json()).toEqual(await b.json())
  })

  it('403 när e-posten inte är bekräftad', async () => {
    mocked.loginUser.mockResolvedValue({ ok: false, reason: 'not_confirmed' })
    expect((await post('/auth/login', { email: USER.email, password: 'x' })).status).toBe(403)
  })

  it('429 från Supabase visas som 429', async () => {
    mocked.loginUser.mockResolvedValue({ ok: false, reason: 'rate_limited' })
    expect((await post('/auth/login', { email: USER.email, password: 'x' })).status).toBe(429)
  })

  it('blockerar efter 5 felaktiga försök från samma IP, utan att fråga Supabase igen', async () => {
    mocked.loginUser.mockResolvedValue({ ok: false, reason: 'invalid_credentials' })
    for (let i = 0; i < 5; i++) expect((await post('/auth/login', { email: USER.email, password: 'fel' }, 'brute')).status).toBe(401)
    const res = await post('/auth/login', { email: USER.email, password: 'fel' }, 'brute')
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(mocked.loginUser).toHaveBeenCalledTimes(5)
  })

  it('400 för ogiltig data', async () => {
    expect((await post('/auth/login', { email: 'inte-epost', password: 'x' })).status).toBe(400)
    expect((await post('/auth/login', { email: USER.email })).status).toBe(400)
    expect(mocked.loginUser).not.toHaveBeenCalled()
  })
})

describe('POST /auth/register', () => {
  it('201 needsConfirmation utan cookie när e-post måste bekräftas', async () => {
    mocked.registerUser.mockResolvedValue({ ok: true, needsConfirmation: true })
    const res = await post('/auth/register', { email: USER.email, password: 'langtlosen123' })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ needsConfirmation: true })
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('201 och inloggad direkt när bekräftelse är avstängd', async () => {
    mocked.registerUser.mockResolvedValue({ ok: true, needsConfirmation: false, user: USER })
    const res = await post('/auth/register', { email: USER.email, password: 'langtlosen123' })
    expect(res.status).toBe(201)
    expect(res.headers.get('set-cookie')).toContain('qb_session=')
  })

  it('400 för kort lösenord utan att fråga Supabase', async () => {
    expect((await post('/auth/register', { email: USER.email, password: 'kort' })).status).toBe(400)
    expect(mocked.registerUser).not.toHaveBeenCalled()
  })

  it('400 för svagt lösenord enligt Supabase, 429 vid spärr', async () => {
    mocked.registerUser.mockResolvedValue({ ok: false, reason: 'weak_password' })
    expect((await post('/auth/register', { email: USER.email, password: 'langtlosen123' })).status).toBe(400)
    mocked.registerUser.mockResolvedValue({ ok: false, reason: 'rate_limited' })
    expect((await post('/auth/register', { email: USER.email, password: 'langtlosen123' })).status).toBe(429)
  })

  it('avslöjar inte om e-posten redan finns', async () => {
    mocked.registerUser.mockResolvedValue({ ok: false, reason: 'cannot_create' })
    const res = await post('/auth/register', { email: USER.email, password: 'langtlosen123' })
    expect(res.status).toBe(400)
    expect(JSON.stringify(await res.json())).not.toMatch(/finns redan|already/i)
  })

  it('429 efter 10 konton per timme från samma IP', async () => {
    mocked.registerUser.mockResolvedValue({ ok: true, needsConfirmation: true })
    for (let i = 0; i < 10; i++) expect((await post('/auth/register', { email: USER.email, password: 'langtlosen123' }, 'reg-spam')).status).toBe(201)
    expect((await post('/auth/register', { email: USER.email, password: 'langtlosen123' }, 'reg-spam')).status).toBe(429)
  })
})

describe('GET /auth/me och POST /auth/logout', () => {
  it('loggedIn:false utan cookie', async () => {
    const res = await app.request('/auth/me')
    expect(await res.json()).toEqual({ loggedIn: false })
  })

  it('visar användaren med giltig cookie', async () => {
    const res = await app.request('/auth/me', { headers: { Cookie: await sessionCookie(USER) } })
    expect(await res.json()).toEqual({ loggedIn: true, user: USER })
  })

  it('logout tar bort cookien', async () => {
    const res = await post('/auth/logout', {})
    expect(res.status).toBe(200)
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('qb_session=')
    expect(cookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i)
  })
})

describe('glömt lösenord och bekräftelse', () => {
  it('forgot-password svarar 200 för vilken e-post som helst', async () => {
    mocked.requestPasswordReset.mockResolvedValue({ ok: true })
    const a = await post('/auth/forgot-password', { email: 'finns@example.com' })
    const b = await post('/auth/forgot-password', { email: 'finns-inte@example.com' })
    expect([a.status, b.status]).toEqual([200, 200])
    expect(await a.json()).toEqual(await b.json())
  })

  it('forgot-password: 5 mejl per timme och IP, sedan 429', async () => {
    mocked.requestPasswordReset.mockResolvedValue({ ok: true })
    for (let i = 0; i < 5; i++) expect((await post('/auth/forgot-password', { email: USER.email }, 'mail-spam')).status).toBe(200)
    expect((await post('/auth/forgot-password', { email: USER.email }, 'mail-spam')).status).toBe(429)
    expect(mocked.requestPasswordReset).toHaveBeenCalledTimes(5)
  })

  it('forgot-password och resend-confirmation har var sin spärr', async () => {
    mocked.requestPasswordReset.mockResolvedValue({ ok: true })
    mocked.resendConfirmation.mockResolvedValue({ ok: true })
    for (let i = 0; i < 5; i++) await post('/auth/forgot-password', { email: USER.email }, 'mail-two')
    expect((await post('/auth/resend-confirmation', { email: USER.email }, 'mail-two')).status).toBe(200)
  })

  it('reset-password: 200 med giltig nyckel, 400 för ogiltig länk, ingen cookie', async () => {
    mocked.resetPassword.mockResolvedValue({ ok: true })
    const ok = await post('/auth/reset-password', { accessToken: JWT, password: 'nyttlosen123' })
    expect(ok.status).toBe(200)
    expect(ok.headers.get('set-cookie')).toBeNull()
    mocked.resetPassword.mockResolvedValue({ ok: false, reason: 'invalid_link' })
    expect((await post('/auth/reset-password', { accessToken: JWT, password: 'nyttlosen123' })).status).toBe(400)
  })

  it('reset-password: 400 för nyckel som inte är en JWT, utan att fråga Supabase', async () => {
    const res = await post('/auth/reset-password', { accessToken: 'hittepå-hittepå-hittepå', password: 'nyttlosen123' })
    expect(res.status).toBe(400)
    expect(mocked.resetPassword).not.toHaveBeenCalled()
  })

  it('reset-password: 10 försök per 15 min och IP, sedan 429', async () => {
    mocked.resetPassword.mockResolvedValue({ ok: false, reason: 'invalid_link' })
    for (let i = 0; i < 10; i++) expect((await post('/auth/reset-password', { accessToken: JWT, password: 'nyttlosen123' }, 'code-spam')).status).toBe(400)
    expect((await post('/auth/reset-password', { accessToken: JWT, password: 'nyttlosen123' }, 'code-spam')).status).toBe(429)
  })

  it('confirm: loggar in (cookie) vid giltig länk, 400 annars', async () => {
    mocked.confirmEmail.mockResolvedValue({ ok: true, user: USER })
    const ok = await post('/auth/confirm', { accessToken: JWT })
    expect(ok.status).toBe(200)
    expect(ok.headers.get('set-cookie')).toContain('qb_session=')
    mocked.confirmEmail.mockResolvedValue({ ok: false, reason: 'invalid_link' })
    const bad = await post('/auth/confirm', { accessToken: JWT })
    expect(bad.status).toBe(400)
    expect(bad.headers.get('set-cookie')).toBeNull()
  })
})
