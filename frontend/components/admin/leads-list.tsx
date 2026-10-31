'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ApiError, getCampaignLeads } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { LeadRow } from '@/lib/types'

const PAGE_SIZE = 50

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; leads: LeadRow[]; total: number }

// Lista med leads (personuppgifter). Hämtar 50 åt gången.
export function LeadsList({ campaignId, onUnauthorized }: { campaignId: string; onUnauthorized: () => void }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)

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

  if (state.leads.length === 0) {
    return (
      <p className="rounded-2xl border border-blush-300/20 bg-plum-900 p-5 text-blush-100">
        Ingen har lämnat sina uppgifter än.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-blush-300" aria-live="polite">
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
