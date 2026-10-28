import { Hono } from 'hono'
import { supabase } from '../database/supabase.js'

export const healthRoutes = new Hono()

healthRoutes.get('/health', (c) => c.json({ status: 'ok', app: 'QuizBloom' }))

// Testar kontakten med Supabase: räknar kampanjer.
healthRoutes.get('/health/db', async (c) => {
  const { count, error } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Supabase-fel:', error.message)
    return c.json({ status: 'error', message: error.message }, 500)
  }
  return c.json({ status: 'ok', campaigns: count })
})
