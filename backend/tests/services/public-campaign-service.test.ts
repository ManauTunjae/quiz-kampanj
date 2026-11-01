import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../helpers/fake-supabase.js'

const state = vi.hoisted(() => ({ fake: null as ReturnType<typeof createFakeSupabase> | null }))
vi.mock('../../src/database/supabase.js', () => ({
  supabase: { from: (t: string) => state.fake!.client.from(t) },
}))

import { getPublicCampaign } from '../../src/services/public-campaign-service.js'

const row = (extra = {}) => ({
  id: 'c1',
  slug: 'quiz',
  title: 'Quiz',
  accent_color: '#E3B6B1',
  is_active: true,
  questions: [
    { id: 'q2', position: 2, text: 'Två', options: [{ id: 'o2', position: 1, text: 'X', is_correct: true }] },
    {
      id: 'q1',
      position: 1,
      text: 'Ett',
      options: [
        { id: 'o-b', position: 2, text: 'B', is_correct: false },
        { id: 'o-a', position: 1, text: 'A', is_correct: true },
      ],
    },
  ],
  ...extra,
})

beforeEach(() => {
  state.fake = null
})

describe('getPublicCampaign', () => {
  it('ber aldrig databasen om kolumnen is_correct', async () => {
    state.fake = createFakeSupabase(() => ({ data: row() }))
    await getPublicCampaign('quiz')
    const select = state.fake.log.find((c) => c.method === 'select')
    expect(String(select?.args[0])).not.toContain('is_correct')
  })

  it('läcker inte rätt svar ens om databasen skulle skicka det', async () => {
    state.fake = createFakeSupabase(() => ({ data: row() }))
    const result = await getPublicCampaign('quiz')
    expect(JSON.stringify(result)).not.toMatch(/is_correct|isCorrect/)
  })

  it('sorterar frågor och alternativ på position', async () => {
    state.fake = createFakeSupabase(() => ({ data: row() }))
    const result = await getPublicCampaign('quiz')
    if (!result || result.paused) throw new Error('väntade en aktiv kampanj')
    expect(result.questions.map((q) => q.id)).toEqual(['q1', 'q2'])
    expect(result.questions[0].options.map((o) => o.id)).toEqual(['o-a', 'o-b'])
  })

  it('ger null när kampanjen saknas', async () => {
    state.fake = createFakeSupabase(() => ({ data: null }))
    expect(await getPublicCampaign('nej')).toBeNull()
  })

  it('skickar bara titeln när kampanjen är pausad', async () => {
    state.fake = createFakeSupabase(() => ({ data: row({ is_active: false }) }))
    expect(await getPublicCampaign('quiz')).toEqual({ paused: true, title: 'Quiz' })
  })
})
