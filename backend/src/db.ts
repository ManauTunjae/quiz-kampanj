import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

// Stoppa direkt med ett tydligt fel om .env saknar värden.
if (!url || !secretKey) {
  throw new Error(
    'Saknar SUPABASE_URL eller SUPABASE_SECRET_KEY. Fyll i backend/.env (se .env.example).'
  )
}

// OBS: Den här klienten använder den HEMLIGA nyckeln.
// Den får bara finnas i backend. Aldrig i frontend.
export const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
