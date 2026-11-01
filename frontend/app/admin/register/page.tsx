import { AuthForm } from '@/components/admin/auth-form'

export default function AdminRegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-2 text-center">
        <p className="text-sm tracking-widest text-blush-300 uppercase">Admin</p>
        <h1 className="text-4xl text-blush-100">QuizBloom</h1>
      </header>
      <AuthForm mode="register" />
    </main>
  )
}
