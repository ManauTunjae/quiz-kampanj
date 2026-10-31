// En enkel spärr som räknar ALLA anrop (till skillnad från login-limiter, som bara räknar fel).
// Lagras i minnet och nollställs när servern startar om.
//
//   const limiter = createRateLimiter({ max: 60, windowMs: 10 * 60 * 1000 })
//   const wait = limiter(key)   // 0 = OK, annars antal sekunder att vänta
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return function check(key: string): number {
    const now = Date.now()

    // Städa bort gamla poster ibland så att minnet inte växer för alltid
    if (hits.size > 1000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
    }

    const entry = hits.get(key)
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return 0
    }
    if (entry.count >= max) return Math.ceil((entry.resetAt - now) / 1000)

    entry.count += 1
    return 0
  }
}
