import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

// Databaskopplingen. Alla som pratar med Supabase importerar "supabase" härifrån.
// OBS: Den här klienten använder den HEMLIGA nyckeln. Bara i backend. Aldrig i frontend.
export const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
