import { describe, expect, it } from 'vitest'
import { escapeCell, toCsv } from '../../src/lib/csv.js'

describe('escapeCell', () => {
  it('lämnar vanlig text som den är', () => {
    expect(escapeCell('Anna')).toBe('Anna')
    expect(escapeCell(42)).toBe('42')
  })

  it('sätter citattecken runt text med semikolon, citattecken eller radbrytning', () => {
    expect(escapeCell('a;b')).toBe('"a;b"')
    expect(escapeCell('säger "hej"')).toBe('"säger ""hej"""')
    expect(escapeCell('rad1\nrad2')).toBe('"rad1\nrad2"')
  })

  it.each(['=1+1', '+1', '-1', '@SUMMA(A1)', '\tx', '\rx'])('stoppar formel-injektion: %j', (value) => {
    // Texten ska börja med ' så att Excel inte kör den som en formel
    expect(escapeCell(value).replace(/^"/, '').startsWith("'")).toBe(true)
  })

  it('skyddar en farlig formel även när den innehåller semikolon', () => {
    const out = escapeCell('=HYPERLINK("http://ond.se";"klicka")')
    expect(out.startsWith(`"'=`)).toBe(true)
  })
})

describe('toCsv', () => {
  it('börjar med BOM, använder semikolon och radbrytning \\r\\n', () => {
    const csv = toCsv(['Namn', 'E-post'], [['Anna', 'anna@example.com']])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe('Namn;E-post\r\nAnna;anna@example.com\r\n')
  })

  it('ger bara rubrikraden när det inte finns några rader', () => {
    expect(toCsv(['A'], []).slice(1)).toBe('A\r\n')
  })
})
