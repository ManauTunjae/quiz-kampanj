import { z } from 'zod'

const email = z
  .string('Skriv din e-postadress')
  .trim()
  .toLowerCase()
  .max(254, 'E-postadressen är för lång')
  .pipe(z.email('Skriv en giltig e-postadress, t.ex. namn@exempel.se'))

// Regler för nytt lösenord. Max 72 tecken (längre kan Supabase inte hantera).
const newPassword = z
  .string('Skriv ett lösenord')
  .min(8, 'Lösenordet måste vara minst 8 tecken')
  .max(72, 'Lösenordet får vara max 72 tecken')

export const registerSchema = z.object({ email, password: newPassword })

// Åtkomstnyckeln (JWT) som Supabase lägger i länken från mejlet. Tre delar med punkt emellan.
const accessToken = z
  .string('Länken är ogiltig')
  .trim()
  .min(20, 'Länken är ogiltig')
  .max(4000, 'Länken är ogiltig')
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, 'Länken är ogiltig')

export const forgotPasswordSchema = z.object({ email })
export const resetPasswordSchema = z.object({ accessToken, password: newPassword })
export const confirmEmailSchema = z.object({ accessToken })
export const resendConfirmationSchema = z.object({ email })

// Vid inloggning kollar vi bara att något är ifyllt. Supabase avgör om det är rätt.
export const loginSchema = z.object({
  email,
  password: z.string('Skriv ditt lösenord').min(1, 'Skriv ditt lösenord').max(200),
})
