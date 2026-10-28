'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { Button, buttonStyles } from '@/components/ui/button'
import { ApiError, listCampaigns } from '@/lib/api'
import { formatDate, plural } from '@/lib/format'
import type { CampaignSummary } from '@/lib/types'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; campaigns: CampaignSummary[] }

export default function AdminCampaignsPage() {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    listCampaigns()
      .then((campaigns) => {
        if (active) setState({ status: 'ready', campaigns })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/admin/login')
          return
        }
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Något gick fel.',
        })
      })
    return () => {
      active = false
    }
  }, [router, attempt])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-blush-100">Kampanjer</h1>
        <Link href="/admin/new" className={buttonStyles('primary')}>
          + Ny kampanj
        </Link>
      </div>

      {state.status === 'loading' && (
        <p role="status" className="text-blush-300">
          Hämtar kampanjer…
        </p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="space-y-4 rounded-2xl border border-blush-300 p-5">
          <p className="text-blush-100">{state.message}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((a) => a + 1)
            }}
          >
            Försök igen
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.campaigns.length === 0 && (
        <div className="space-y-4 rounded-2xl border border-blush-300/20 bg-plum-900 p-6">
          <p className="text-blush-100">Du har inga kampanjer än.</p>
          <Link href="/admin/new" className={buttonStyles('primary')}>
            Skapa din första kampanj
          </Link>
        </div>
      )}

      {state.status === 'ready' && state.campaigns.length > 0 && (
        <ul className="space-y-4">
          {state.campaigns.map((c) => (
            <li
              key={c.id}
              className="space-y-4 rounded-2xl border border-blush-300/20 bg-plum-900 p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 size-3 shrink-0 rounded-full border border-blush-300/60"
                  style={{ backgroundColor: c.accentColor }}
                />
                <div className="min-w-0 space-y-1">
                  <h2 className="text-xl break-words text-blush-100">{c.title}</h2>
                  <p className="text-sm text-blush-300">
                    {plural(c.questionCount, 'fråga', 'frågor')} ·{' '}
                    {plural(c.participantCount, 'deltagare', 'deltagare')} · skapad{' '}
                    {formatDate(c.createdAt)}
                  </p>
                  <p className="font-mono text-sm break-all text-blush-300">/q/{c.slug}</p>
                </div>
              </div>
              <CopyLinkButton slug={c.slug} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
