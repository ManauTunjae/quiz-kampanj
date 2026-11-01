import { AuthShell } from '@/components/admin/auth-shell'
import { ForgotPasswordForm } from '@/components/admin/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  )
}
