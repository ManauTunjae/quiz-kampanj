import { describe, expect, it } from 'vitest'
import { formatNumber, plural } from '@/lib/format'

describe('plural', () => {
  it('använder ental för 1 och flertal annars', () => {
    expect(plural(1, 'fråga', 'frågor')).toBe('1 fråga')
    expect(plural(0, 'fråga', 'frågor')).toBe('0 frågor')
    expect(plural(4, 'fråga', 'frågor')).toBe('4 frågor')
  })
})

describe('formatNumber', () => {
  it('använder decimalkomma och högst en decimal', () => {
    expect(formatNumber(1.44)).toBe('1,4')
    expect(formatNumber(2)).toBe('2')
  })
})
