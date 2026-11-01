import { z } from 'zod'

const email = z
  .string('Skriv din e-postadress')
  .trim()
  .toLowerCase()
  .max(254, 'E-postadressen är för lång')
  .pipe(z.email('Skriv en giltig e-postadress, t.ex. namn@exempel.se'))

// Regler för nytt lösenord. Max 72 tecken (längre kan Supabase inte hantera).
export const registerSchema = z.object({
  email,
  password: z
    .string('Skriv ett lösenord')
    .min(8, 'Lösenordet måste vara minst 8 tecken')
    .max(72, 'Lösenordet får vara max 72 tecken'),
})

// Vid inloggning kollar vi bara att något är ifyllt. Supabase avgör om det är rätt.
export const loginSchema = z.object({
  email,
  password: z.string('Skriv ditt lösenord').min(1, 'Skriv ditt lösenord').max(200),
})
