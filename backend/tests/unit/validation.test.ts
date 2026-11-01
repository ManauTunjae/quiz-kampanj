import { describe, expect, it } from 'vitest'
import { createCampaignSchema, updateCampaignSchema } from '../../src/validation/campaign.js'
import { leadSchema } from '../../src/validation/lead.js'
import { loginSchema, registerSchema, resetPasswordSchema } from '../../src/validation/auth.js'
import { submitAnswersSchema } from '../../src/validation/submission.js'
import { slugParamSchema } from '../../src/validation/slug.js'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const question = (text = 'Fråga?') => ({
  text,
  options: [
    { text: 'A', isCorrect: true },
    { text: 'B', isCorrect: false },
  ],
})
const validCampaign = () => ({ title: 'Mitt quiz', questions: [question(), question(), question()] })

describe('createCampaignSchema', () => {
  it('godkänner en giltig kampanj och sätter standardfärg', () => {
    const r = createCampaignSchema.safeParse(validCampaign())
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.accentColor).toBe('#E3B6B1')
  })

  it('kräver 3–5 frågor', () => {
    expect(createCampaignSchema.safeParse({ ...validCampaign(), questions: [question(), question()] }).success).toBe(false)
    expect(createCampaignSchema.safeParse({ ...validCampaign(), questions: Array(6).fill(question()) }).success).toBe(false)
  })

  it('kräver exakt ett rätt alternativ per fråga', () => {
    const noCorrect = { text: 'F', options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: false }] }
    const twoCorrect = { text: 'F', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] }
    for (const bad of [noCorrect, twoCorrect]) {
      expect(createCampaignSchema.safeParse({ ...validCampaign(), questions: [bad, question(), question()] }).success).toBe(false)
    }
  })

  it('kräver 2–4 alternativ', () => {
    const one = { text: 'F', options: [{ text: 'A', isCorrect: true }] }
    expect(createCampaignSchema.safeParse({ ...validCampaign(), questions: [one, question(), question()] }).success).toBe(false)
  })

  it('avvisar fel färgformat och tom titel', () => {
    expect(createCampaignSchema.safeParse({ ...validCampaign(), accentColor: 'rosa' }).success).toBe(false)
    expect(createCampaignSchema.safeParse({ ...validCampaign(), title: '   ' }).success).toBe(false)
  })
})

describe('updateCampaignSchema', () => {
  it('kräver minst ett fält', () => {
    expect(updateCampaignSchema.safeParse({}).success).toBe(false)
    expect(updateCampaignSchema.safeParse({ isActive: false }).success).toBe(true)
  })

  it.each([{ slug: 'ny-slug' }, { isCorrect: true }, { ownerId: uuid(1) }])('avvisar okända fält: %j', (extra) => {
    expect(updateCampaignSchema.safeParse({ title: 'Ny', ...extra }).success).toBe(false)
  })

  it('avvisar isCorrect inne i ett alternativ', () => {
    const q = (n: number) => ({
      id: uuid(n),
      text: 'F',
      options: [
        { id: uuid(n + 10), text: 'A', isCorrect: true },
        { id: uuid(n + 20), text: 'B' },
      ],
    })
    expect(updateCampaignSchema.safeParse({ questions: [q(1), q(2), q(3)] }).success).toBe(false)
  })
})

describe('leadSchema', () => {
  it('trimmar namn och gör e-post till små bokstäver', () => {
    const r = leadSchema.safeParse({ name: '  Anna ', email: ' ANNA@Example.COM ', consent: true })
    expect(r.success && r.data).toEqual({ name: 'Anna', email: 'anna@example.com', consent: true })
  })

  it('kräver att consent är exakt true', () => {
    for (const consent of [false, 'true', 1, undefined]) {
      expect(leadSchema.safeParse({ name: 'A', email: 'a@b.se', consent }).success).toBe(false)
    }
  })

  it('avvisar ogiltig e-post och för långt namn', () => {
    expect(leadSchema.safeParse({ name: 'A', email: 'inte-en-epost', consent: true }).success).toBe(false)
    expect(leadSchema.safeParse({ name: 'A'.repeat(101), email: 'a@b.se', consent: true }).success).toBe(false)
  })
})

describe('auth-scheman', () => {
  it('registrering: lösenord 8–72 tecken', () => {
    expect(registerSchema.safeParse({ email: 'a@b.se', password: '1234567' }).success).toBe(false)
    expect(registerSchema.safeParse({ email: 'a@b.se', password: '12345678' }).success).toBe(true)
    expect(registerSchema.safeParse({ email: 'a@b.se', password: 'x'.repeat(73) }).success).toBe(false)
  })

  it('inloggning: kräver bara att något är ifyllt', () => {
    expect(loginSchema.safeParse({ email: 'a@b.se', password: 'a' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'a@b.se', password: '' }).success).toBe(false)
  })

  it('återställning: åtkomstnyckeln måste se ut som en JWT (tre delar)', () => {
    const jwt = `${'a'.repeat(10)}.${'b'.repeat(10)}.${'c'.repeat(10)}`
    expect(resetPasswordSchema.safeParse({ accessToken: jwt, password: '12345678' }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ accessToken: 'bara-text-utan-punkter-alls', password: '12345678' }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({ accessToken: 'a.b.c', password: '12345678' }).success).toBe(false)
  })
})

describe('submitAnswersSchema', () => {
  it('godkänner svar med uuid och ignorerar extra fält som score', () => {
    const r = submitAnswersSchema.safeParse({ answers: [{ questionId: uuid(1), optionId: uuid(2) }], score: 99 })
    expect(r.success).toBe(true)
    if (r.success) expect('score' in r.data).toBe(false)
  })

  it('avvisar tom lista, fler än 5 svar och id som inte är uuid', () => {
    expect(submitAnswersSchema.safeParse({ answers: [] }).success).toBe(false)
    const one = { questionId: uuid(1), optionId: uuid(2) }
    expect(submitAnswersSchema.safeParse({ answers: Array(6).fill(one) }).success).toBe(false)
    expect(submitAnswersSchema.safeParse({ answers: [{ questionId: '1', optionId: '2' }] }).success).toBe(false)
  })
})

describe('slugParamSchema', () => {
  it.each(['mitt-quiz', 'quiz1', 'a'])('godkänner %s', (slug) => {
    expect(slugParamSchema.safeParse({ slug }).success).toBe(true)
  })
  it.each(['Stor', 'a--b', '-a', 'a-', 'a b', 'å', 'a'.repeat(81)])('avvisar %s', (slug) => {
    expect(slugParamSchema.safeParse({ slug }).success).toBe(false)
  })
})
