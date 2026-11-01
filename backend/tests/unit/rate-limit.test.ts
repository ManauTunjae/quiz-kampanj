import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter } from '../../src/lib/rate-limit.js'
import { clearFails, registerFail, secondsLeftIfBlocked } from '../../src/lib/login-limiter.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createRateLimiter', () => {
  it('släpper igenom max antal anrop och blockerar nästa', () => {
    const check = createRateLimiter({ max: 3, windowMs: 60_000 })
    expect([check('a'), check('a'), check('a')]).toEqual([0, 0, 0])
    expect(check('a')).toBeGreaterThan(0)
  })

  it('räknar varje nyckel för sig', () => {
    const check = createRateLimiter({ max: 1, windowMs: 60_000 })
    expect(check('a')).toBe(0)
    expect(check('b')).toBe(0)
    expect(check('a')).toBeGreaterThan(0)
  })

  it('svarar med antal sekunder att vänta, och släpper igenom igen när tiden gått', () => {
    const check = createRateLimiter({ max: 1, windowMs: 60_000 })
    check('a')
    vi.advanceTimersByTime(10_000)
    expect(check('a')).toBe(50)
    vi.advanceTimersByTime(50_001)
    expect(check('a')).toBe(0)
  })
})

describe('login-limiter', () => {
  it('blockerar efter 5 fel och släpper igen efter 15 minuter', () => {
    const key = 'ip-1'
    for (let i = 0; i < 4; i++) registerFail(key)
    expect(secondsLeftIfBlocked(key)).toBe(0)
    registerFail(key)
    expect(secondsLeftIfBlocked(key)).toBeGreaterThan(0)
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000)
    expect(secondsLeftIfBlocked(key)).toBe(0)
  })

  it('nollställs vid lyckad inloggning', () => {
    const key = 'ip-2'
    for (let i = 0; i < 5; i++) registerFail(key)
    clearFails(key)
    expect(secondsLeftIfBlocked(key)).toBe(0)
  })
})
