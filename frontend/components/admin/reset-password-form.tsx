'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { buttonStyles, Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { ApiError, resetPassword } from '@/lib/api'
import { useAuthLink } from '@/lib/auth-link'

const linkStyles =
  'inline-flex min-h-12 items-center text-blush-300 underline underline-offset-4 hover:text-blush-100'

// Steg 2 av "glömt lösenord": nyckeln kommer från länken i mejlet (efter # i adressen).
export function ResetPasswordForm() {
  const link = useAuthLink()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting || link.status !== 'ready') return
    setPasswordError('')
    setFormError('')
    setSubmitting(true)
    try {
      await resetPassword(link.accessToken, password)
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.issues.some((i) => i.path === 'password')) {
        setPasswordError(err.issues.find((i) => i.path === 'password')!.message)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (link.status === 'loading' && !done) {
    return (
      <p role="status" className="text-center text-blush-300">
        Laddar…
      </p>
    )
  }

  if ((link.status === 'missing' || link.status === 'failed') && !done) {
    return (
      <div role="alert" className="space-y-4 rounded-2xl border border-blush-300 bg-plum-900 p-6 text-center">
        <h1 className="text-2xl text-blush-100">Länken fungerar inte</h1>
        <p className="text-blush-100">
          {link.status === 'failed' ? link.message : 'Länken saknar kod, eller så har du redan använt den.'} Begär en ny länk.
        </p>
        <Link href="/admin/forgot-password" className={buttonStyles('primary')}>
          Begär ny länk
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div role="status" className="space-y-4 rounded-2xl border border-blush-300/20 bg-plum-900 p-6 text-center">
        <h1 className="text-2xl text-blush-100">Lösenordet är bytt ✓</h1>
        <p className="text-blush-100">Nu kan du logga in med ditt nya lösenord.</p>
        <Link href="/admin/login" className={buttonStyles('primary')}>
          Logga in
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
      <h1 className="text-2xl text-blush-100">Välj nytt lösenord</h1>

      <div className="space-y-3">
        <TextField
          label="Nytt lösenord"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          hint="Minst 8 tecken."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          disabled={submitting}
          autoFocus
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
      </div>

      {formError && (
        <div role="alert" className="space-y-2 rounded-xl border border-blush-300 p-3 text-blush-100">
          <p>{formError}</p>
          <Link href="/admin/forgot-password" className={linkStyles}>
            Begär en ny länk
          </Link>
        </div>
      )}

      <Button type="submit" disabled={submitting} className="min-h-14 w-full text-lg">
        {submitting ? 'Sparar…' : 'Spara lösenord'}
      </Button>
    </form>
  )
}
