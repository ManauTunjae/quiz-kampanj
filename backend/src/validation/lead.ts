import { z } from 'zod'

// Id i adressen: /api/submissions/:id/lead
// Ett id som inte är ett riktigt uuid kan inte finnas, så vi svarar 404 (se routen).
export const submissionParamSchema = z.object({ id: z.uuid() })

// Det besökaren fyller i. Samtycke och samtyckestext hanteras av servern:
// "consent" måste vara exakt true, och texten som sparas kommer från lib/consent.ts.
export const leadSchema = z.object({
  name: z
    .string('Skriv ditt namn')
    .trim()
    .min(1, 'Skriv ditt namn')
    .max(100, 'Namnet är för långt (max 100 tecken)'),
  email: z
    .string('Skriv din e-postadress')
    .trim()
    .toLowerCase()
    .max(254, 'E-postadressen är för lång')
    .pipe(z.email('Skriv en giltig e-postadress, t.ex. namn@exempel.se')),
  consent: z.literal(true, { error: 'Du måste godkänna för att skicka in' }),
})

export type LeadInput = z.infer<typeof leadSchema>
