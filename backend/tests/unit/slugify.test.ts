import { describe, expect, it } from 'vitest'
import { slugify } from '../../src/utils/slugify.js'

describe('slugify', () => {
  it('gör små bokstäver och tar bort å, ä, ö', () => {
    expect(slugify('Höstquiz för Naturen!')).toBe('hostquiz-for-naturen')
  })

  it('slår ihop konstiga tecken till ett bindestreck och trimmar kanterna', () => {
    expect(slugify('  --Hej   &  hå!!  ')).toBe('hej-ha')
  })

  it('är högst 50 tecken och slutar aldrig på bindestreck', () => {
    const slug = slugify('a'.repeat(49) + ' bbb')
    expect(slug.length).toBeLessThanOrEqual(50)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('använder "kampanj" när inget är kvar', () => {
    expect(slugify('!!!')).toBe('kampanj')
    expect(slugify('')).toBe('kampanj')
  })
})
