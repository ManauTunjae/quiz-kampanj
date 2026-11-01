import { serializeSigned } from 'hono/utils/cookie'

// Bygger en giltig inloggnings-cookie (signerad med test-hemligheten i vitest.config.ts).
// Så kan testerna låtsas vara inloggade utan att prata med Supabase.
export async function sessionCookie(
  user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.com' },
  iat = Date.now()
): Promise<string> {
  const value = JSON.stringify({ id: user.id, email: user.email, iat })
  const header = await serializeSigned('qb_session', value, process.env.SESSION_SECRET as string, { path: '/' })
  return header.split(';')[0] // bara "namn=värde", så som webbläsaren skickar den
}

// Rubriker för ett vanligt JSON-anrop från vårt frontend (annars blockerar csrf-skyddet)
export const jsonHeaders = (cookie?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3000',
  ...(cookie ? { Cookie: cookie } : {}),
})
