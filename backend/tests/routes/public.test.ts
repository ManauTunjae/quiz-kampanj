import { describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { jsonHeaders } from '../helpers/session-cookie.js'
import { mocked } from '../helpers/mock-services.js'

const SUB = '44444444-4444-4444-8444-444444444444'
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const post = (path: string, body: unknown, ip = 'ip-public') =>
  app.request(path, { method: 'POST', headers: { ...jsonHeaders(), 'X-Test-Ip': ip }, body: JSON.stringify(body) })

describe('GET /api/campaigns/:slug', () => {
  it('200 med kampanjen', async () => {
    mocked.getPublicCampaign.mockResolvedValue({ paused: false, id: 'c1', slug: 'quiz', title: 'Quiz', questions: [] })
    const res = await app.request('/api/campaigns/quiz')
    expect(res.status).toBe(200)
    expect((await res.json()).campaign.title).toBe('Quiz')
  })

  it('404 med no-store när kampanjen saknas', async () => {
    mocked.getPublicCampaign.mockResolvedValue(null)
    const res = await app.request('/api/campaigns/finns-inte')
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('410 med no-store och bara titeln när kampanjen är pausad', async () => {
    mocked.getPublicCampaign.mockResolvedValue({ paused: true, title: 'Quiz' })
    const res = await app.request('/api/campaigns/quiz')
    expect(res.status).toBe(410)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toMatchObject({ paused: true, title: 'Quiz' })
  })

  it('404 för en slug med konstiga tecken, utan att fråga databasen', async () => {
    const res = await app.request('/api/campaigns/Stor_Bokstav')
    expect(res.status).toBe(404)
    expect(mocked.getPublicCampaign).not.toHaveBeenCalled()
  })
})

describe('POST /api/campaigns/:slug/submissions', () => {
  const body = { answers: [{ questionId: uuid(1), optionId: uuid(2) }] }

  it('201 med poäng och samtyckestext, men utan rätt svar', async () => {
    mocked.submitAnswers.mockResolvedValue({ ok: true, submissionId: SUB, score: 2, total: 3 })
    const res = await post('/api/campaigns/quiz/submissions', body)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toMatchObject({ submissionId: SUB, score: 2, total: 3 })
    expect(typeof json.consentText).toBe('string')
    expect(JSON.stringify(json)).not.toMatch(/correct/i)
  })

  it('skickar vidare bara svaren, aldrig en poäng från besökaren', async () => {
    mocked.submitAnswers.mockResolvedValue({ ok: true, submissionId: SUB, score: 0, total: 3 })
    await post('/api/campaigns/quiz/submissions', { ...body, score: 999 })
    expect(mocked.submitAnswers).toHaveBeenCalledWith('quiz', body.answers)
  })

  it.each([
    ['not_found', 404],
    ['paused', 410],
    ['invalid_answers', 400],
  ])('mappar %s till %i', async (reason, status) => {
    mocked.submitAnswers.mockResolvedValue({ ok: false, reason })
    expect((await post('/api/campaigns/quiz/submissions', body)).status).toBe(status)
  })

  it('400 med lista över fel när svaren är ogiltiga', async () => {
    const res = await post('/api/campaigns/quiz/submissions', { answers: [] })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Ogiltig data')
    expect(json.issues[0]).toHaveProperty('message')
    expect(mocked.submitAnswers).not.toHaveBeenCalled()
  })

  it('429 med Retry-After efter 60 försök från samma IP', async () => {
    mocked.submitAnswers.mockResolvedValue({ ok: true, submissionId: SUB, score: 0, total: 3 })
    for (let i = 0; i < 60; i++) expect((await post('/api/campaigns/quiz/submissions', body, 'ip-spam')).status).toBe(201)
    const res = await post('/api/campaigns/quiz/submissions', body, 'ip-spam')
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    // En annan IP påverkas inte
    expect((await post('/api/campaigns/quiz/submissions', body, 'ip-annan')).status).toBe(201)
  })
})

describe('POST /api/submissions/:id/lead', () => {
  const lead = { name: 'Anna Test', email: 'Anna@Example.com', consent: true }

  it('201 och skickar tillbaka inga personuppgifter', async () => {
    mocked.saveLead.mockResolvedValue({ ok: true })
    const res = await post(`/api/submissions/${SUB}/lead`, lead, 'ip-lead-1')
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true })
    expect(mocked.saveLead).toHaveBeenCalledWith(SUB, { name: 'Anna Test', email: 'anna@example.com', consent: true })
  })

  it('400 utan samtycke, och inget sparas', async () => {
    const res = await post(`/api/submissions/${SUB}/lead`, { ...lead, consent: false }, 'ip-lead-2')
    expect(res.status).toBe(400)
    expect(mocked.saveLead).not.toHaveBeenCalled()
  })

  it('404 för ett id som inte är ett uuid', async () => {
    const res = await post('/api/submissions/inte-ett-uuid/lead', lead, 'ip-lead-3')
    expect(res.status).toBe(404)
    expect(mocked.saveLead).not.toHaveBeenCalled()
  })

  it.each([
    ['not_found', 404],
    ['already_saved', 409],
  ])('mappar %s till %i', async (reason, status) => {
    mocked.saveLead.mockResolvedValue({ ok: false, reason })
    expect((await post(`/api/submissions/${SUB}/lead`, lead, 'ip-lead-4')).status).toBe(status)
  })
})
