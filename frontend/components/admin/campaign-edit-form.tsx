'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ColorField, isHexColor } from '@/components/admin/color-field'
import { Button, buttonStyles } from '@/components/ui/button'
import { inputStyles, TextField } from '@/components/ui/text-field'
import { ApiError, getCampaignDetail, updateCampaign } from '@/lib/api'
import type { CampaignDetail } from '@/lib/types'

type Load =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; campaign: CampaignDetail }

// Gör om ett serverfel som "questions.1.options" till text: "Fråga 2: ..."
function describeIssue(path: string, message: string): string {
  const match = path.match(/^questions\.(\d+)/)
  return match ? `Fråga ${Number(match[1]) + 1}: ${message}` : message
}

// Hämtar kampanjen och visar redigeringsformuläret
export function CampaignEditForm({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getCampaignDetail(campaignId)
      .then((campaign) => {
        if (active) setLoad({ status: 'ready', campaign })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 401) return router.replace('/admin/login')
        if (err instanceof ApiError && err.status === 404) return setLoad({ status: 'notfound' })
        setLoad({ status: 'error', message: err instanceof ApiError ? err.message : 'Något gick fel.' })
      })
    return () => {
      active = false
    }
  }, [campaignId, attempt, router])

  const back = (
    <Link
      href={`/admin/campaigns/${campaignId}`}
      className="inline-flex min-h-12 items-center text-blush-300 underline-offset-4 hover:text-blush-100 hover:underline"
    >
      ← Tillbaka till statistiken
    </Link>
  )

  if (load.status === 'loading') {
    return (
      <p role="status" className="text-blush-300">
        Hämtar kampanjen…
      </p>
    )
  }

  if (load.status === 'notfound') {
    return (
      <div className="space-y-4">
        <Link href="/admin" className="inline-flex min-h-12 items-center text-blush-300 underline-offset-4 hover:text-blush-100 hover:underline">
          ← Alla kampanjer
        </Link>
        <h1 className="text-3xl text-blush-100">Kampanjen finns inte</h1>
      </div>
    )
  }

  if (load.status === 'error') {
    return (
      <div role="alert" className="space-y-4 rounded-2xl border border-blush-300 p-5">
        <p className="text-blush-100">{load.message}</p>
        <Button
          variant="secondary"
          onClick={() => {
            setLoad({ status: 'loading' })
            setAttempt((a) => a + 1)
          }}
        >
          Försök igen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {back}
      <div className="space-y-2">
        <h1 className="text-3xl text-blush-100">Redigera kampanj</h1>
        <p className="text-blush-300">
          Du kan ändra titel, färg och texter. Antal frågor och vilket svar som är rätt kan inte ändras,
          för då skulle gamla deltagares poäng inte stämma.
        </p>
        <p className="font-mono text-sm break-all text-blush-300">Länken /q/{load.campaign.slug} ändras inte.</p>
      </div>
      <EditFields campaign={load.campaign} onSaved={(c) => setLoad({ status: 'ready', campaign: c })} />
    </div>
  )
}

// id → text för alla frågor och alternativ
function buildTexts(campaign: CampaignDetail): Record<string, string> {
  const t: Record<string, string> = {}
  for (const q of campaign.questions) {
    t[q.id] = q.text
    for (const o of q.options) t[o.id] = o.text
  }
  return t
}

// ---------- Själva formuläret ----------
function EditFields({ campaign, onSaved }: { campaign: CampaignDetail; onSaved: (c: CampaignDetail) => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(campaign.title)
  const [accent, setAccent] = useState(campaign.accentColor)
  // id → text (frågor och alternativ)
  const [texts, setTexts] = useState<Record<string, string>>(() => buildTexts(campaign))
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const errorsRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (errors.length > 0) errorsRef.current?.focus()
  }, [errors])
  useEffect(() => {
    if (saved) savedRef.current?.focus()
  }, [saved])

  const changed =
    title !== campaign.title ||
    accent.toLowerCase() !== campaign.accentColor.toLowerCase() ||
    campaign.questions.some(
      (q) => texts[q.id] !== q.text || q.options.some((o) => texts[o.id] !== o.text)
    )

  const setText = (id: string, value: string) => {
    setSaved(false)
    setTexts((t) => ({ ...t, [id]: value }))
  }

  function validate(): string[] {
    const problems: string[] = []
    if (!title.trim()) problems.push('Titel saknas.')
    if (!isHexColor(accent)) problems.push('Färgen ska se ut så här: #E3B6B1.')
    campaign.questions.forEach((q, qi) => {
      if (!texts[q.id]?.trim()) problems.push(`Fråga ${qi + 1}: skriv en fråga.`)
      q.options.forEach((o, oi) => {
        if (!texts[o.id]?.trim()) problems.push(`Fråga ${qi + 1}, alternativ ${oi + 1}: skriv ett svar.`)
      })
    })
    return problems
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return // skydd mot dubbelklick
    const problems = validate()
    if (problems.length > 0) return setErrors(problems)

    setErrors([])
    setSaving(true)
    try {
      const updated = await updateCampaign(campaign.id, {
        title: title.trim(),
        accentColor: accent,
        // Vi skickar bara id och text. Rätt svar skickas aldrig (servern tillåter det inte).
        questions: campaign.questions.map((q) => ({
          id: q.id,
          text: texts[q.id].trim(),
          options: q.options.map((o) => ({ id: o.id, text: texts[o.id].trim() })),
        })),
      })
      // Visa exakt det som sparades (servern tar bort extra mellanslag)
      setTitle(updated.title)
      setAccent(updated.accentColor)
      setTexts(buildTexts(updated))
      setSaved(true)
      onSaved(updated) // nya jämförelsevärden: "Spara" stängs av tills något ändras
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return router.replace('/admin/login')
      if (err instanceof ApiError) {
        setErrors([err.message, ...err.issues.map((i) => describeIssue(i.path, i.message))])
      } else {
        setErrors(['Något gick fel. Försök igen.'])
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => {
        if (errors.length > 0) setErrors([])
      }}
      noValidate
      className="space-y-8"
    >
      {saved && (
        <p
          ref={savedRef}
          tabIndex={-1}
          role="status"
          className="rounded-xl border border-blush-300/40 px-4 py-3 text-blush-100"
        >
          Sparat ✓
        </p>
      )}

      {errors.length > 0 && (
        <div ref={errorsRef} role="alert" tabIndex={-1} className="rounded-xl border border-blush-300 bg-plum-900 p-4">
          <p className="font-semibold text-blush-100">Det här behöver rättas:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-blush-100">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-5 rounded-2xl border border-blush-300/20 bg-plum-900 p-5">
        <TextField
          label="Titel"
          value={title}
          onChange={(e) => {
            setSaved(false)
            setTitle(e.target.value)
          }}
          maxLength={120}
          autoComplete="off"
        />
        <ColorField
          value={accent}
          onChange={(v) => {
            setSaved(false)
            setAccent(v)
          }}
        />
      </section>

      {campaign.questions.map((q, qi) => (
        <fieldset key={q.id} className="space-y-4 rounded-2xl border border-blush-300/20 bg-plum-900 p-5">
          <legend className="px-2 text-lg font-semibold text-blush-300">Fråga {qi + 1}</legend>
          <input
            aria-label={`Fråga ${qi + 1}`}
            value={texts[q.id] ?? ''}
            onChange={(e) => setText(q.id, e.target.value)}
            maxLength={300}
            autoComplete="off"
            className={inputStyles}
          />
          <div className="space-y-3">
            {q.options.map((o, oi) => (
              <div key={o.id} className="space-y-1">
                {o.isCorrect && (
                  <p className="text-sm font-medium text-blush-300">✓ Rätt svar (kan inte ändras)</p>
                )}
                <input
                  aria-label={`Alternativ ${oi + 1}, fråga ${qi + 1}${o.isCorrect ? ' (rätt svar)' : ''}`}
                  value={texts[o.id] ?? ''}
                  onChange={(e) => setText(o.id, e.target.value)}
                  maxLength={200}
                  autoComplete="off"
                  className={inputStyles}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="space-y-3">
        <Button type="submit" disabled={saving || !changed} className="min-h-14 w-full text-lg">
          {saving ? 'Sparar…' : 'Spara ändringar'}
        </Button>
        {!changed && !saving && <p className="text-sm text-blush-300">Inga ändringar att spara än.</p>}
        <Link href={`/admin/campaigns/${campaign.id}`} className={`${buttonStyles('ghost')} w-full`}>
          Tillbaka utan att spara
        </Link>
      </div>
    </form>
  )
}
