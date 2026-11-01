'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ApiError, resendConfirmation } from '@/lib/api'

// "Skicka mejlet igen". Servern svarar alltid ok, även om adressen saknar konto.
export function ResendConfirmation({ email }: { email: string }) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (busy) return
    if (!email.trim()) return setError('Skriv din e-postadress i fältet först.')
    setBusy(true)
    setError('')
    try {
      await resendConfirmation(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={send} disabled={busy} className="w-full">
        {busy ? 'Skickar…' : 'Skicka mejlet igen'}
      </Button>
      {sent && (
        <p role="status" className="text-blush-100">
          Klart. Om adressen finns har vi skickat ett nytt mejl. Titta i skräpposten också.
        </p>
      )}
      {error && (
        <p role="alert" className="text-blush-100">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
