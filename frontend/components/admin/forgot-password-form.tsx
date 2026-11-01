'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { ApiError, forgotPassword } from '@/lib/api'

// Steg 1 av "glömt lösenord": skriv e-post, få ett mejl med länk.
// Vi säger samma sak oavsett om adressen har ett konto.
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setEmailError('')
    setFormError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.issues.length > 0) {
        setEmailError(err.issues[0].message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div role="status" className="space-y-4 rounded-2xl border border-blush-300/20 bg-plum-900 p-6 text-center">
        <h1 className="text-2xl text-blush-100">Kolla din e-post</h1>
        <p className="text-blush-100">
          Om adressen har ett konto har vi skickat en länk för att byta lösenord. Titta i skräpposten
          också. Länken gäller en kort stund.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex min-h-12 items-center text-blush-300 underline underline-offset-4 hover:text-blush-100"
        >
          Till inloggningen
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5 rounded-2xl border border-blush-300/20 bg-plum-900 p-6"
    >
      <div className="space-y-2">
        <h1 className="text-2xl text-blush-100">Glömt lösenordet?</h1>
        <p className="text-blush-300">Skriv din e-post. Då skickar vi en länk där du väljer ett nytt lösenord.</p>
      </div>

      <TextField
        label="E-post"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
        disabled={submitting}
        autoFocus
      />

      {formError && (
        <p role="alert" className="rounded-xl border border-blush-300 p-3 text-blush-100">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="min-h-14 w-full text-lg">
        {submitting ? 'Skickar…' : 'Skicka länk'}
      </Button>

      <p className="text-center">
        <Link
          href="/admin/login"
          className="inline-flex min-h-12 items-center text-blush-300 underline underline-offset-4 hover:text-blush-100"
        >
          Tillbaka till inloggningen
        </Link>
      </p>
    </form>
  )
}
