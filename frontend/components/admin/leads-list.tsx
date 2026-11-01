'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDelete } from '@/components/admin/confirm-delete'
import { ApiError, deleteLead, getCampaignLeads } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { LeadRow } from '@/lib/types'

const PAGE_SIZE = 50

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; leads: LeadRow[]; total: number }

// Lista med leads (personuppgifter). Hämtar 50 åt gången.
export function LeadsList({
  campaignId,
  onUnauthorized,
  onLeadDeleted,
}: {
  campaignId: string
  onUnauthorized: () => void
  onLeadDeleted?: () => void // så att siffrorna högst upp kan räkna ner
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [deletedCount, setDeletedCount] = useState(0)
  const countRef = useRef<HTMLParagraphElement>(null)

  // Efter radering försvinner knappen. Flytta fokus hit så skärmläsare läser upp beskedet.
  useEffect(() => {
    if (deletedCount > 0) countRef.current?.focus()
  }, [deletedCount])

  useEffect(() => {
    let active = true
    getCampaignLeads(campaignId, PAGE_SIZE, 0)
      .then((page) => {
        if (active) setState({ status: 'ready', leads: page.leads, total: page.total })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 401) return onUnauthorized()
        setState({ status: 'error', message: err instanceof ApiError ? err.message : 'Något gick fel.' })
      })
    return () => {
      active = false
    }
  }, [campaignId, attempt, onUnauthorized])

  async function loadMore() {
    if (state.status !== 'ready' || loadingMore) return
    setLoadingMore(true)
    setMoreError(null)
    try {
      const page = await getCampaignLeads(campaignId, PAGE_SIZE, state.leads.length)
      setState({ status: 'ready', leads: [...state.leads, ...page.leads], total: page.total })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setMoreError(err instanceof ApiError ? err.message : 'Något gick fel.')
    } finally {
      setLoadingMore(false)
    }
  }

  async function removeLead(id: string) {
    let reallyDeleted = true
    try {
      await deleteLead(campaignId, id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      if (err instanceof ApiError && err.status === 404) reallyDeleted = false // fanns redan inte
      else throw err // ConfirmDelete visar felet
    }
    setState((prev) =>
      prev.status === 'ready'
        ? { status: 'ready', leads: prev.leads.filter((l) => l.id !== id), total: Math.max(0, prev.total - 1) }
        : prev
    )
    setDeletedCount((n) => n + 1)
    if (reallyDeleted) onLeadDeleted?.()
  }

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-blush-300">
        Hämtar leads…
      </p>
    )
  }

  if (state.status === 'error') {
    return (
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
    )
  }

  if (state.total === 0) {
    return (
      <p className="rounded-2xl border border-blush-300/20 bg-plum-900 p-5 text-blush-100">
        Ingen har lämnat sina uppgifter än.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p ref={countRef} tabIndex={-1} className="text-sm text-blush-300" aria-live="polite">
        {deletedCount > 0 && 'Leaden är raderad. '}
        Visar {state.leads.length} av {state.total}
      </p>
      <ul className="space-y-3">
        {state.leads.map((lead) => (
          <li key={lead.id} className="space-y-1 rounded-2xl border border-blush-300/20 bg-plum-900 p-4">
            <p className="font-medium break-words text-blush-100">{lead.name}</p>
            <p className="break-all">
              <a href={`mailto:${lead.email}`} className="text-blush-300 underline underline-offset-4 hover:text-blush-100">
                {lead.email}
              </a>
            </p>
            <p className="text-sm text-blush-300">
              {lead.score} av {lead.total} rätt · samtycke {formatDate(lead.consentAt)}
            </p>
            <div className="pt-2">
              <ConfirmDelete
                label="Radera"
                ariaLabel={`Radera uppgifterna för ${lead.name}`}
                question={`Radera uppgifterna för ${lead.name}?`}
                warning="Namn och e-post tas bort för alltid. Svaren i statistiken finns kvar."
                confirmLabel="Ja, radera"
                onConfirm={() => removeLead(lead.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      {moreError && (
        <p role="alert" className="rounded-xl border border-blush-300/60 px-4 py-3 text-blush-100">
          {moreError}
        </p>
      )}
      {state.leads.length < state.total && (
        <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Hämtar…' : 'Visa fler'}
        </Button>
      )}
    </div>
  )
}
