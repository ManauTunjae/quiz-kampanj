'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ResendConfirmation } from '@/components/admin/resend-confirmation'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { ApiError, getMe, login, register } from '@/lib/api'

type Mode = 'login' | 'register'
type Field = 'email' | 'password'

const TEXT = {
  login: {
    title: 'Logga in',
    submit: 'Logga in',
    submitting: 'Loggar in…',
    otherText: 'Har du inget konto?',
    otherLink: 'Skapa konto',
    otherHref: '/admin/register',
  },
  register: {
    title: 'Skapa konto',
    submit: 'Skapa konto',
    submitting: 'Skapar konto…',
    otherText: 'Har du redan ett konto?',
    otherLink: 'Logga in',
    otherHref: '/admin/login',
  },
} as const

// Samma formulär för inloggning och registrering.
// Felmeddelandena kommer från servern (på svenska).
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const t = TEXT[mode]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [notConfirmed, setNotConfirmed] = useState(false) // 403: e-posten är inte bekräftad

  // Redan inloggad? Gå direkt till admin.
  useEffect(() => {
    let active = true
    getMe()
      .then((me) => {
        if (active && me.loggedIn) router.replace('/admin')
      })
      .catch(() => {
        // Servern svarar inte. Vi visar det när man försöker skicka formuläret.
      })
    return () => {
      active = false
    }
  }, [router])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFieldErrors({})
    setFormError('')
    setNotConfirmed(false)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        router.replace('/admin')
      } else {
        const result = await register(email, password)
        if (result.needsConfirmation) {
          setCheckEmail(true)
          setSubmitting(false)
        } else {
          router.replace('/admin')
        }
      }
    } catch (err) {
      setSubmitting(false)
      if (!(err instanceof ApiError)) {
        setFormError('Något gick fel. Försök igen.')
        return
      }
      if (err.status === 400 && err.issues.length > 0) {
        const next: Partial<Record<Field, string>> = {}
        for (const issue of err.issues) {
          const field = issue.path as Field
          if ((field === 'email' || field === 'password') && !next[field]) next[field] = issue.message
        }
        setFieldErrors(next)
        if (Object.keys(next).length > 0) return
      }
      if (err.status === 403) setNotConfirmed(true)
      setFormError(err.message)
    }
  }

  if (checkEmail) {
    return (
      <div
        role="status"
        className="space-y-3 rounded-2xl border border-blush-300/20 bg-plum-900 p-6 text-center"
      >
        <h2 className="text-2xl text-blush-100">Kolla din e-post</h2>
        <p className="text-blush-100">
          Vi har skickat en länk till din e-postadress. Klicka på den för att bekräfta kontot.
          Sedan kan du logga in.
        </p>
        <ResendConfirmation email={email} />
        <Link href="/admin/login" className="inline-flex min-h-12 items-center text-blush-300 underline underline-offset-4 hover:text-blush-100">
          Gå till inloggningen
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="auth-title"
      className="space-y-5 rounded-2xl border border-blush-300/20 bg-plum-900 p-6"
    >
      <h2 id="auth-title" className="text-2xl text-blush-100">
        {t.title}
      </h2>

      <TextField
        label="E-post"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        disabled={submitting}
        autoFocus
      />

      <div className="space-y-3">
        <TextField
          label="Lösenord"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          hint={mode === 'register' ? 'Minst 8 tecken.' : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={submitting}
        />
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-blush-100">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="size-5 accent-blush-300"
          />
          Visa lösenord
        </label>
        {mode === 'login' && (
          <Link
            href="/admin/forgot-password"
            className="inline-flex min-h-12 items-center text-blush-300 underline underline-offset-4 hover:text-blush-100"
          >
            Glömt lösenordet?
          </Link>
        )}
      </div>

      {formError && (
        <p role="alert" className="rounded-xl border border-blush-300 p-3 text-blush-100">
          {formError}
        </p>
      )}

      {notConfirmed && <ResendConfirmation email={email} />}

      <Button type="submit" disabled={submitting} className="min-h-14 w-full text-lg">
        {submitting ? t.submitting : t.submit}
      </Button>

      <p className="text-center text-blush-100">
        {t.otherText}{' '}
        <Link href={t.otherHref} className="text-blush-300 underline underline-offset-4 hover:text-blush-100">
          {t.otherLink}
        </Link>
      </p>
    </form>
  )
}
