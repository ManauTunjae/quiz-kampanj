import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'

// Vem skickar anropet? (IP-adressen). Används av spärrarna mot spam och gissning.
// OBS: Står servern bakom en proxy (t.ex. vid driftsättning) är det proxyns adress vi ser.
// Då behöver man läsa headern "X-Forwarded-For" från en proxy man litar på.
export function clientKey(c: Context): string {
  return getConnInfo(c).remote.address ?? 'unknown'
}
