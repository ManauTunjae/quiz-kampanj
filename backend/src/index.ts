import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { supabase } from './db.js'

const app = new Hono()

const port = Number(process.env.PORT ?? 8000)
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'

// Viktigt: cors() ligger FÖRST, före alla routes.
// credentials: true behövs för cookies. Då får origin inte vara "*".
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: frontendOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
)

app.get('/health', (c) => c.json({ status: 'ok', app: 'QuizBloom' }))

// Testar kontakten med Supabase: räknar kampanjer.
app.get('/health/db', async (c) => {
  const { count, error } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Supabase-fel:', error.message)
    return c.json({ status: 'error', message: error.message }, 500)
  }
  return c.json({ status: 'ok', campaigns: count })
})

serve({ fetch: app.fetch, port }, () => {
  console.log(`QuizBloom backend kör på http://localhost:${port}`)
})
