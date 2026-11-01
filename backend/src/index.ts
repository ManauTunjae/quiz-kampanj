import { serve } from '@hono/node-server'
import { app } from './app.js'
import { env } from './config/env.js'

// Startar servern. Appen i sig (routes, cors, skydd) finns i app.ts, så att tester kan använda den utan server.
serve({ fetch: app.fetch, port: env.port }, () => {
  console.log(`QuizBloom backend kör på http://localhost:${env.port}`)
})
