import type { Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { env } from '../config/env.js'

// Admin-sessionen: en signerad, httpOnly-cookie.
// Cookien innehåller bara tidpunkten då du loggade in, signerad med SESSION_SECRET.
// Ingen kan ändra den utan att signaturen blir fel.

const COOKIE_NAME = 'qb_admin'
const SESSION_SECONDS = 8 * 60 * 60 // 8 timmar

export async function startSession(c: Context) {
  await setSignedCookie(c, COOKIE_NAME, String(Date.now()), env.sessionSecret, {
    httpOnly: true, // JavaScript i webbläsaren kommer inte åt cookien
    sameSite: 'Lax',
    path: '/',
    secure: env.isProd, // true bara i produktion (kräver https)
    maxAge: SESSION_SECONDS,
  })
}

export function endSession(c: Context) {
  // path måste vara samma som när cookien skapades, annars tas den inte bort
  deleteCookie(c, COOKIE_NAME, { path: '/' })
}

export async function isAdmin(c: Context): Promise<boolean> {
  const value = await getSignedCookie(c, env.sessionSecret, COOKIE_NAME)
  if (!value) return false // saknas, eller signaturen är fel
  const issuedAt = Number(value)
  const age = Date.now() - issuedAt
  return Number.isFinite(issuedAt) && age >= 0 && age < SESSION_SECONDS * 1000
}
