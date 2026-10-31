'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { ApiError, saveLead } from '@/lib/api'

type Props = {
  submissionId: string
  consentText: string // kommer från servern, skrivs aldrig om här
}

type Field = 'name' | 'email' | 'consent'
type Status = 'idle' | 'sending' | 'saved'

// Frivilligt formulär efter resultatet: namn + e-post + samtycke (GDPR).
export function LeadForm({ submissionId, consentText }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status !== 'idle') return // skydd mot dubbelklick
    setStatus('sending')
    setFieldErrors({})
    setFormError(null)

    try {
      await saveLead(submissionId, { name, email, consent })
      setStatus('saved')
    } catch (err) {
      setStatus('idle')
      if (!(err instanceof ApiError)) {
        setFormError('Något gick fel. Försök igen.')
        return
      }
      if (err.status === 409) {
        // Uppgifterna finns redan sparade: det är inget fel för besökaren
        setStatus('saved')
        return
      }
      if (err.status === 400 && err.issues.length > 0) {
        const next: Partial<Record<Field, string>> = {}
        for (const issue of err.issues) {
          const field = issue.path as Field
          if (['name', 'email', 'consent'].includes(field) && !next[field]) next[field] = issue.message
        }
        setFieldErrors(next)
        if (Object.keys(next).length > 0) return
      }
      setFormError(
        err.status === 404 ? 'Vi hittade inte ditt quiz. Börja om och försök igen.' : err.message
      )
    }
  }

  if (status === 'saved') {
    return (
      <section
        aria-labelledby="lead-thanks"
        className="animate-fade-in space-y-3 rounded-3xl border border-blush-300/30 bg-plum-900 px-6 py-8 text-center"
      >
        <h2
          id="lead-thanks"
          ref={(el) => el?.focus({ preventScroll: true })}
          tabIndex={-1}
          className="text-2xl text-blush-100 outline-none"
        >
          Tack!
        </h2>
        <p role="status" className="text-blush-100">
          Dina uppgifter är sparade.
        </p>
      </section>
    )
  }

  const sending = status === 'sending'

  return (
    <section
      aria-labelledby="lead-heading"
      className="space-y-6 rounded-3xl border border-blush-300/30 bg-plum-900 px-6 py-8 text-left"
    >
      <div className="space-y-2">
        <h2 id="lead-heading" className="text-2xl text-blush-100">
          Vill du bli kontaktad?
        </h2>
        <p className="text-blush-300">Det här är valfritt. Du kan hoppa över det.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <TextField
          label="Namn"
          name="name"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          disabled={sending}
        />
        <TextField
          label="E-post"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={sending}
        />

        {/* Samtycke: en stor yta som är lätt att trycka på. Rutan är aldrig förkryssad från början. */}
        <div className="space-y-2">
          <label
            className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 ${
              fieldErrors.consent ? 'border-2 border-blush-100' : 'border-blush-300/60'
            }`}
          >
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={fieldErrors.consent ? true : undefined}
              aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
              disabled={sending}
              className="mt-0.5 size-6 shrink-0 accent-blush-300"
            />
            <span className="text-base text-blush-100">{consentText}</span>
          </label>
          {fieldErrors.consent && (
            <p id="consent-error" className="text-sm font-medium text-blush-100">
              <span aria-hidden="true">⚠ </span>
              {fieldErrors.consent}
            </p>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-blush-300/60 px-4 py-3 text-center text-blush-100"
          >
            {formError}
          </p>
        )}

        <Button type="submit" className="min-h-14 w-full text-lg" disabled={sending}>
          {sending ? 'Skickar…' : 'Skicka'}
        </Button>
      </form>
    </section>
  )
}
