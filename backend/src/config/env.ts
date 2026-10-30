// ALLA miljövariabler läses här, på ett ställe.
// Resten av koden importerar "env" härifrån och använder aldrig process.env direkt.

const required = [
  'ADMIN_PASSWORD',
  'SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
] as const

// Stoppa direkt med ett tydligt fel om något saknas i backend/.env
const missing = required.filter((name) => !process.env[name])
if (missing.length > 0) {
  throw new Error(
    `Saknar värden i backend/.env: ${missing.join(', ')}. Se .env.example.`
  )
}

const get = (name: (typeof required)[number]) => process.env[name] as string

if (get('SESSION_SECRET').length < 32) {
  throw new Error('SESSION_SECRET är för kort. Använd minst 32 tecken.')
}

export const env = {
  port: Number(process.env.PORT ?? 8000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  isProd: process.env.NODE_ENV === 'production',

  adminPassword: get('ADMIN_PASSWORD'),
  sessionSecret: get('SESSION_SECRET'),

  // Den HEMLIGA nyckeln. Får bara finnas i backend.
  supabaseUrl: get('SUPABASE_URL'),
  supabaseSecretKey: get('SUPABASE_SECRET_KEY'),
}
