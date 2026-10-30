'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { ApiError, getMe, login } from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Redan inloggad? Gå direkt till admin.
  useEffect(() => {
    let active = true
    getMe()
      .then((loggedIn) => {
        if (active && loggedIn) router.replace('/admin')
      })
      .catch(() => {
        // Servern svarar inte. Vi visar det när man försöker logga in.
      })
    return () => {
      active = false
    }
  }, [router])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(password)
      router.replace('/admin')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.')
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-2 text-center">
        <p className="text-sm tracking-widest text-blush-300 uppercase">Admin</p>
        <h1 className="text-4xl text-blush-100">QuizBloom</h1>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-blush-300/20 bg-plum-900 p-6"
      >
        <TextField
          label="Lösenord"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />

        {error && (
          <p role="alert" className="rounded-xl border border-blush-300 p-3 text-blush-100">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting || password === ''} className="w-full">
          {submitting ? 'Loggar in…' : 'Logga in'}
        </Button>
      </form>
    </main>
  )
}
