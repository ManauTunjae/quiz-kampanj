'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { LeadsList } from '@/components/admin/leads-list'
import { QuestionStats } from '@/components/admin/question-stats'
import { Button } from '@/components/ui/button'
import { ApiError, getCampaignStats } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import type { CampaignStats } from '@/lib/types'

type State =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; stats: CampaignStats }

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-blush-300/20 bg-plum-900 p-4">
      <dt className="text-sm text-blush-300">{label}</dt>
      <dd className="mt-1 font-serif text-3xl text-blush-100">{value}</dd>
      {hint && <dd className="mt-1 text-sm text-blush-300">{hint}</dd>}
    </div>
  )
}

// Admin-dashboard för en kampanj: siffror, svar per fråga och leads.
export function CampaignDashboard({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const goToLogin = useCallback(() => router.replace('/admin/login'), [router])

  useEffect(() => {
    let active = true
    getCampaignStats(campaignId)
      .then((stats) => {
        if (active) setState({ status: 'ready', stats })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 401) return goToLogin()
        if (err instanceof ApiError && err.status === 404) return setState({ status: 'notfound' })
        setState({ status: 'error', message: err instanceof ApiError ? err.message : 'Något gick fel.' })
      })
    return () => {
      active = false
    }
  }, [campaignId, attempt, goToLogin])

  const back = (
    <Link href="/admin" className="inline-flex min-h-12 items-center text-blush-300 underline-offset-4 hover:text-blush-100 hover:underline">
      ← Alla kampanjer
    </Link>
  )

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-blush-300">
        Hämtar statistik…
      </p>
    )
  }

  if (state.status === 'notfound') {
    return (
      <div className="space-y-4">
        {back}
        <h1 className="text-3xl text-blush-100">Kampanjen finns inte</h1>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-4">
        {back}
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
      </div>
    )
  }

  const { stats } = state
  const leadShare =
    stats.participantCount === 0 ? null : Math.round((stats.leadCount / stats.participantCount) * 100)

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        {back}
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-3 size-3 shrink-0 rounded-full border border-blush-300/60"
            style={{ backgroundColor: stats.campaign.accentColor }}
          />
          <div className="min-w-0 space-y-1">
            <h1 className="text-3xl break-words text-blush-100">{stats.campaign.title}</h1>
            <p className="font-mono text-sm break-all text-blush-300">/q/{stats.campaign.slug}</p>
          </div>
        </div>
        <CopyLinkButton slug={stats.campaign.slug} />
      </div>

      <section aria-labelledby="summary-heading" className="space-y-4">
        <h2 id="summary-heading" className="text-2xl text-blush-100">
          Översikt
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <Tile label="Deltagare" value={String(stats.participantCount)} />
          <Tile
            label="Lämnade uppgifter"
            value={String(stats.leadCount)}
            hint={leadShare === null ? undefined : `${leadShare} % av deltagarna`}
          />
          <Tile
            label="Snittpoäng"
            value={stats.averageScore === null ? '–' : formatNumber(stats.averageScore)}
            hint={stats.averageScore === null ? 'Inga svar än' : `av ${stats.questionCount} möjliga`}
          />
          <Tile label="Frågor" value={String(stats.questionCount)} />
        </dl>
      </section>

      <section aria-labelledby="answers-heading" className="space-y-4">
        <h2 id="answers-heading" className="text-2xl text-blush-100">
          Svar per fråga
        </h2>
        {stats.participantCount === 0 && <p className="text-blush-300">Ingen har svarat än.</p>}
        <div className="space-y-4">
          {stats.questions.map((q) => (
            <QuestionStats key={q.id} question={q} />
          ))}
        </div>
      </section>

      <section aria-labelledby="leads-heading" className="space-y-4">
        <h2 id="leads-heading" className="text-2xl text-blush-100">
          Leads
        </h2>
        <LeadsList campaignId={campaignId} onUnauthorized={goToLogin} />
      </section>
    </div>
  )
}
