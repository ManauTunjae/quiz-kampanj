import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

// Klient för Supabase Auth (registrera och logga in användare).
// Den använder den PUBLISHABLE nyckeln, inte den hemliga.
//
// Vi skapar en NY klient för varje anrop. Annars skulle en klient komma ihåg den
// senast inloggade användaren i minnet, och det vill vi aldrig dela mellan besökare.
export function createAuthClient() {
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
