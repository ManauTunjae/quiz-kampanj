import type { Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { env } from '../config/env.js'

// Inloggningen: en signerad, httpOnly-cookie.
// Cookien innehåller användarens id, e-post och när hen loggade in.
// Den är signerad med SESSION_SECRET, så ingen kan ändra den utan att signaturen blir fel.
// Lösenordet finns aldrig i cookien (Supabase sköter lösenorden).

export type SessionUser = { id: string; email: string }

const COOKIE_NAME = 'qb_session'
const SESSION_SECONDS = 8 * 60 * 60 // 8 timmar

export async function startSession(c: Context, user: SessionUser) {
  const value = JSON.stringify({ id: user.id, email: user.email, iat: Date.now() })
  await setSignedCookie(c, COOKIE_NAME, value, env.sessionSecret, {
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

// Returnerar den inloggade användaren, eller null om ingen är inloggad.
export async function getSessionUser(c: Context): Promise<SessionUser | null> {
  const raw = await getSignedCookie(c, env.sessionSecret, COOKIE_NAME)
  if (!raw) return null // saknas, eller signaturen är fel

  try {
    const data = JSON.parse(raw) as { id?: unknown; email?: unknown; iat?: unknown }
    if (typeof data.id !== 'string' || typeof data.email !== 'string' || typeof data.iat !== 'number') {
      return null
    }
    const age = Date.now() - data.iat
    if (age < 0 || age >= SESSION_SECONDS * 1000) return null
    return { id: data.id, email: data.email }
  } catch {
    return null
  }
}
