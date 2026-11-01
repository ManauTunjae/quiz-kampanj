import { AuthShell } from '@/components/admin/auth-shell'
import { ResetPasswordForm } from '@/components/admin/reset-password-form'

// Länken i mejlet går först till Supabase och sedan hit. Nyckeln står efter # i adressen
// och läses i webbläsaren (se lib/auth-link.ts).
export default function Page() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  )
}
