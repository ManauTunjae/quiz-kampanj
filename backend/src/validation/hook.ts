import type { Context } from 'hono'

// Gemensamt svar när inskickad data är ogiltig. Används som 3:e argument i zValidator.
// Svar: 400 { error: "Ogiltig data", issues: [{ path, message }] }
// Vi kräver bara det vi använder: "issues" (lista med fel).
type ValidationResult =
  | { success: true }
  | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }

export function onInvalid(result: ValidationResult, c: Context) {
  if (result.success) return
  return c.json(
    {
      error: 'Ogiltig data',
      issues: result.error.issues.map((i) => ({
        path: i.path.map(String).join('.'),
        message: i.message,
      })),
    },
    400
  )
}
