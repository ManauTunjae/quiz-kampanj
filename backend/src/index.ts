import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { env } from './config/env.js'
import { requireAdmin } from './middleware/require-admin.js'
import { adminCampaigns } from './routes/admin-campaigns.js'
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { publicCampaigns } from './routes/public-campaigns.js'
import { publicSubmissions } from './routes/public-submissions.js'

const app = new Hono()

// Viktigt: cors() ligger FÖRST, före alla routes och före auth.
// credentials: true behövs för cookies. Då får origin inte vara "*".
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: env.frontendOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
)
// Skydd mot att andra webbplatser skickar formulär till oss med din cookie.
app.use('*', csrf({ origin: env.frontendOrigin }))

// Öppna routes
app.route('/', healthRoutes)
app.route('/auth', authRoutes)
app.route('/api', publicCampaigns) // GET /api/campaigns/:slug (för besökare)
app.route('/api', publicSubmissions) // POST /api/submissions/:id/lead

// Allt under /api/admin kräver inloggning
app.use('/api/admin/*', requireAdmin)
app.route('/api/admin', adminCampaigns)

// Alla oväntade fel hamnar här. Vi loggar detaljerna men visar dem inte för användaren.
app.onError((err, c) => {
  // Fel som Hono själv skapar med en tänkt statuskod (t.ex. 403 från csrf) behåller den.
  if (err instanceof HTTPException) return err.getResponse()

  console.error(err)
  return c.json({ error: 'Något gick fel på servern' }, 500)
})

serve({ fetch: app.fetch, port: env.port }, () => {
  console.log(`QuizBloom backend kör på http://localhost:${env.port}`)
})
