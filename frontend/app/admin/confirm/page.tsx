import { AuthShell } from '@/components/admin/auth-shell'
import { ConfirmEmailCard } from '@/components/admin/confirm-email-card'

// Länken i mejlet går först till Supabase och sedan hit. Nyckeln står efter # i adressen
// och läses i webbläsaren (se lib/auth-link.ts).
export default function Page() {
  return (
    <AuthShell>
      <ConfirmEmailCard />
    </AuthShell>
  )
}
