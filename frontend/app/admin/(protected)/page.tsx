'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDelete } from '@/components/admin/confirm-delete'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { Button, buttonStyles } from '@/components/ui/button'
import { ApiError, deleteCampaign, listCampaigns } from '@/lib/api'
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
  const [deletedCount, setDeletedCount] = useState(0)
  const noticeRef = useRef<HTMLParagraphElement>(null)

  // Efter radering försvinner knappen. Flytta fokus till beskedet.
  useEffect(() => {
    if (deletedCount > 0) noticeRef.current?.focus()
  }, [deletedCount])

  async function removeCampaign(id: string) {
    try {
      await deleteCampaign(id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return router.replace('/admin/login')
      if (!(err instanceof ApiError && err.status === 404)) throw err // 404 = redan raderad
    }
    setState((prev) =>
      prev.status === 'ready' ? { status: 'ready', campaigns: prev.campaigns.filter((c) => c.id !== id) } : prev
    )
    setDeletedCount((n) => n + 1)
  }

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

      {deletedCount > 0 && (
        <p
          ref={noticeRef}
          tabIndex={-1}
          role="status"
          className="mb-4 rounded-xl border border-blush-300/40 px-4 py-3 text-blush-100"
        >
          Kampanjen är raderad.
        </p>
      )}

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
                  {!c.isActive && (
                    <p className="inline-block rounded-full border border-blush-300 px-3 py-1 text-sm text-blush-100">
                      ⏸ Pausad
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/admin/campaigns/${c.id}`} className={buttonStyles('primary')}>
                  Visa statistik
                </Link>
                <CopyLinkButton slug={c.slug} />
                <Link href={`/admin/campaigns/${c.id}/edit`} className={buttonStyles('secondary')}>
                  Redigera
                </Link>
                <ConfirmDelete
                  label="Radera"
                  ariaLabel={`Radera kampanjen ${c.title}`}
                  question={`Radera "${c.title}"?`}
                  warning={`Frågor, ${plural(c.participantCount, 'deltagare', 'deltagare')} och alla leads tas bort för alltid.`}
                  confirmLabel="Ja, radera allt"
                  onConfirm={() => removeCampaign(c.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
