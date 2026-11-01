'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, buttonStyles } from '@/components/ui/button'
import { ApiError, confirmEmail } from '@/lib/api'
import { useAuthLink } from '@/lib/auth-link'

// Bekräfta e-post: nyckeln kommer från länken i mejlet (efter # i adressen).
// Vi väntar på att användaren trycker på knappen innan vi loggar in.
export function ConfirmEmailCard() {
  const router = useRouter()
  const link = useAuthLink()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (busy || link.status !== 'ready') return
    setBusy(true)
    setError('')
    try {
      await confirmEmail(link.accessToken)
      router.replace('/admin') // koden loggar in oss direkt
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.')
      setBusy(false)
    }
  }

  if (link.status === 'loading') {
    return (
      <p role="status" className="text-center text-blush-300">
        Laddar…
      </p>
    )
  }

  if (link.status !== 'ready') {
    return (
      <div role="alert" className="space-y-4 rounded-2xl border border-blush-300 bg-plum-900 p-6 text-center">
        <h1 className="text-2xl text-blush-100">Länken fungerar inte</h1>
        <p className="text-blush-100">
          {link.status === 'failed' ? link.message : 'Länken saknar kod, eller så har du redan använt den.'}
        </p>
        <p className="text-blush-300">Logga in. Är kontot inte bekräftat kan du få ett nytt mejl där.</p>
        <Link href="/admin/login" className={buttonStyles('primary')}>
          Till inloggningen
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-2xl border border-blush-300/20 bg-plum-900 p-6 text-center">
      <h1 className="text-2xl text-blush-100">Bekräfta din e-post</h1>
      <p className="text-blush-100">Tryck på knappen så är ditt konto klart.</p>
      {error && (
        <div role="alert" className="space-y-2 rounded-xl border border-blush-300 p-3 text-blush-100">
          <p>{error}</p>
          <Link
            href="/admin/login"
            className="inline-flex min-h-12 items-center text-blush-300 underline underline-offset-4 hover:text-blush-100"
          >
            Till inloggningen (där kan du få ett nytt mejl)
          </Link>
        </div>
      )}
      <Button onClick={confirm} disabled={busy} className="min-h-14 w-full text-lg">
        {busy ? 'Bekräftar…' : 'Bekräfta min e-post'}
      </Button>
    </div>
  )
}
