import { createHash, timingSafeEqual } from 'node:crypto'

// Jämför lösenord på ett säkert sätt (tar lika lång tid oavsett var det skiljer).
// Vi hashar först så att båda värdena alltid är lika långa.
export function samePassword(input: string, expected: string): boolean {
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}
