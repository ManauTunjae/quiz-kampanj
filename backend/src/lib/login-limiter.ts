import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'

// Enkel spärr mot gissning av lösenord: max 5 fel per 15 minuter per IP.
// Lagras i minnet (nollställs när servern startar om). Räcker för ett testprojekt.
const MAX_FAILS = 5
const WINDOW_MS = 15 * 60 * 1000
const fails = new Map<string, { count: number; resetAt: number }>()

// Vem försöker logga in? (IP-adressen)
export function clientKey(c: Context): string {
  return getConnInfo(c).remote.address ?? 'unknown'
}

// 0 = inte blockerad. Annars: antal sekunder kvar.
export function secondsLeftIfBlocked(key: string): number {
  const entry = fails.get(key)
  if (!entry) return 0
  if (Date.now() > entry.resetAt) {
    fails.delete(key)
    return 0
  }
  return entry.count >= MAX_FAILS ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0
}

export function registerFail(key: string) {
  const entry = fails.get(key)
  if (!entry || Date.now() > entry.resetAt) {
    fails.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS })
  } else {
    entry.count += 1
  }
}

export function clearFails(key: string) {
  fails.delete(key)
}
