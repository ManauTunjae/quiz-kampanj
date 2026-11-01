import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../helpers/fake-supabase.js'

const state = vi.hoisted(() => ({ fake: null as ReturnType<typeof createFakeSupabase> | null }))
vi.mock('../../src/database/supabase.js', () => ({
  supabase: { from: (t: string) => state.fake!.client.from(t) },
}))

import { submitAnswers } from '../../src/services/submission-service.js'

const Q1 = '00000000-0000-4000-8000-000000000001'
const Q2 = '00000000-0000-4000-8000-000000000002'
const Q3 = '00000000-0000-4000-8000-000000000003'
const o = (q: number, n: number) => `00000000-0000-4000-8000-0000000000${q}${n}`

// Tre frågor. Alternativ 1 är rätt i alla.
const campaign = (isActive = true) => ({
  id: 'c1',
  is_active: isActive,
  questions: [Q1, Q2, Q3].map((id, i) => ({
    id,
    options: [
      { id: o(i + 1, 1), is_correct: true },
      { id: o(i + 1, 2), is_correct: false },
    ],
  })),
})

function setup(opts: { campaign?: unknown; answersError?: boolean } = {}) {
  state.fake = createFakeSupabase(({ table, calls }) => {
    if (table === 'campaigns') return { data: 'campaign' in opts ? opts.campaign : campaign() }
    if (table === 'submissions' && calls.some((c) => c.method === 'insert')) return { data: { id: 'sub-1' } }
    if (table === 'answers' && opts.answersError) return { error: { message: 'boom' } }
    return {}
  })
  return state.fake
}

const answer = (q: string, opt: string) => ({ questionId: q, optionId: opt })
const allCorrect = () => [answer(Q1, o(1, 1)), answer(Q2, o(2, 1)), answer(Q3, o(3, 1))]

beforeEach(() => {
  state.fake = null
})

describe('submitAnswers', () => {
  it('räknar poängen på servern', async () => {
    setup()
    const r = await submitAnswers('quiz', [answer(Q1, o(1, 1)), answer(Q2, o(2, 2)), answer(Q3, o(3, 1))])
    expect(r).toEqual({ ok: true, submissionId: 'sub-1', score: 2, total: 3 })
  })

  it('sparar poängen som räknades ut, och ett svar per fråga', async () => {
    const fake = setup()
    await submitAnswers('quiz', allCorrect())
    const sub = fake.log.find((c) => c.table === 'submissions' && c.method === 'insert')
    expect(sub?.args[0]).toEqual({ campaign_id: 'c1', score: 3, total: 3 })
    const ans = fake.log.find((c) => c.table === 'answers' && c.method === 'insert')
    expect(ans?.args[0]).toHaveLength(3)
  })

  it('ger not_found när kampanjen saknas', async () => {
    setup({ campaign: null })
    expect(await submitAnswers('finns-inte', allCorrect())).toEqual({ ok: false, reason: 'not_found' })
  })

  it('ger paused och sparar ingenting när kampanjen är pausad', async () => {
    const fake = setup({ campaign: campaign(false) })
    expect(await submitAnswers('quiz', allCorrect())).toEqual({ ok: false, reason: 'paused' })
    expect(fake.log.some((c) => c.method === 'insert')).toBe(false)
  })

  it('avvisar för få svar', async () => {
    setup()
    const r = await submitAnswers('quiz', [answer(Q1, o(1, 1))])
    expect(r).toEqual({ ok: false, reason: 'invalid_answers' })
  })

  it('avvisar två svar på samma fråga', async () => {
    setup()
    const r = await submitAnswers('quiz', [answer(Q1, o(1, 1)), answer(Q1, o(1, 1)), answer(Q2, o(2, 1))])
    expect(r).toEqual({ ok: false, reason: 'invalid_answers' })
  })

  it('avvisar ett alternativ som hör till en annan fråga', async () => {
    setup()
    const r = await submitAnswers('quiz', [answer(Q1, o(2, 1)), answer(Q2, o(2, 1)), answer(Q3, o(3, 1))])
    expect(r).toEqual({ ok: false, reason: 'invalid_answers' })
  })

  it('avvisar okända id och sparar ingenting', async () => {
    const fake = setup()
    const r = await submitAnswers('quiz', [answer(Q1, o(1, 1)), answer(Q2, o(2, 1)), answer('00000000-0000-4000-8000-0000000000ff', o(3, 1))])
    expect(r).toEqual({ ok: false, reason: 'invalid_answers' })
    expect(fake.log.some((c) => c.method === 'insert')).toBe(false)
  })

  it('tar bort deltagaren igen om svaren inte kan sparas', async () => {
    const fake = setup({ answersError: true })
    await expect(submitAnswers('quiz', allCorrect())).rejects.toThrow('Kunde inte spara svar')
    const del = fake.log.find((c) => c.table === 'submissions' && c.method === 'delete')
    expect(del).toBeDefined()
    expect(fake.log.find((c) => c.table === 'submissions' && c.method === 'eq')?.args).toEqual(['id', 'sub-1'])
  })

  it('kastar fel när databasen svarar med fel', async () => {
    state.fake = createFakeSupabase(() => ({ error: { message: 'nere' } }))
    await expect(submitAnswers('quiz', allCorrect())).rejects.toThrow('Kunde inte hämta kampanj')
  })
})
