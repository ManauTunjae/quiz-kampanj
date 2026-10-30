'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { getMe, logout } from '@/lib/api'

// Alla sidor i (protected) kräver inloggning.
// Mappen "(protected)" syns inte i URL:en: /admin och /admin/new.
type Status = 'checking' | 'ok' | 'offline'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('checking')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getMe()
      .then((loggedIn) => {
        if (!active) return
        if (loggedIn) setStatus('ok')
        else router.replace('/admin/login')
      })
      .catch(() => {
        if (active) setStatus('offline')
      })
    return () => {
      active = false
    }
  }, [router, attempt])

  async function onLogout() {
    try {
      await logout()
    } catch {
      // Även om det misslyckas går vi till inloggningen
    }
    router.replace('/admin/login')
  }

  if (status === 'checking') {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <p role="status" className="text-blush-300">
          Laddar…
        </p>
      </main>
    )
  }

  if (status === 'offline') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <p role="alert" className="text-blush-100">
          Kan inte nå servern. Kör backend på port 8000?
        </p>
        <Button
          onClick={() => {
            setStatus('checking')
            setAttempt((a) => a + 1)
          }}
        >
          Försök igen
        </Button>
      </main>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-blush-300/20 py-4">
        <div className="flex items-baseline gap-3">
          <Link href="/admin" className="font-serif text-2xl text-blush-100">
            QuizBloom
          </Link>
          <span className="text-sm tracking-widest text-blush-300 uppercase">Admin</span>
        </div>
        <nav aria-label="Admin" className="flex items-center gap-1">
          <Link
            href="/admin"
            className="inline-flex min-h-12 items-center rounded-xl px-3 text-blush-100 hover:bg-plum-900"
          >
            Kampanjer
          </Link>
          <Link
            href="/admin/new"
            className="inline-flex min-h-12 items-center rounded-xl px-3 text-blush-100 hover:bg-plum-900"
          >
            Ny kampanj
          </Link>
          <Button variant="ghost" onClick={onLogout}>
            Logga ut
          </Button>
        </nav>
      </header>
      <main className="pt-8">{children}</main>
    </div>
  )
}
