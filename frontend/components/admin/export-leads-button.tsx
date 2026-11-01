'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ApiError, downloadLeadsCsv } from '@/lib/api'

// Knapp som laddar ner alla leads som CSV-fil (öppnas i Excel).
export function ExportLeadsButton({ campaignId, onUnauthorized }: { campaignId: string; onUnauthorized: () => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    if (busy) return // skydd mot dubbelklick
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const filename = await downloadLeadsCsv(campaignId)
      setMessage(`Filen ${filename} är nedladdad.`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setError(err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={download} disabled={busy}>
        {busy ? 'Hämtar…' : 'Exportera CSV'}
      </Button>
      <p className="text-sm text-blush-300">Filen innehåller namn och e-post. Spara den säkert.</p>
      {message && (
        <p role="status" className="text-blush-100 break-words">
          {message}
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
