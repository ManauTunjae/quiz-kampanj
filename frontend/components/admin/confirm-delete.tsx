'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'

type Props = {
  label: string // t.ex. "Radera"
  ariaLabel?: string // t.ex. "Radera Anna Test" (för skärmläsare)
  question: string // t.ex. "Radera uppgifterna för Anna Test?"
  warning?: string // t.ex. "Det går inte att ångra."
  confirmLabel: string // t.ex. "Ja, radera"
  onConfirm: () => Promise<void>
}

// Knapp som först frågar "Är du säker?" innan något raderas.
// Fokus startar på "Avbryt" (det säkra valet). Escape avbryter.
export function ConfirmDelete({ label, ariaLabel, question, warning, confirmLabel, onConfirm }: Props) {
  const [phase, setPhase] = useState<'idle' | 'asking' | 'working'>('idle')
  const [error, setError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function cancel() {
    setPhase('idle')
    setError(null)
    // Flytta tillbaka fokus till knappen när frågan försvinner
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  async function confirm() {
    if (phase === 'working') return // skydd mot dubbelklick
    setPhase('working')
    setError(null)
    try {
      await onConfirm()
      // Lyckades: föräldern tar bort oss (eller byter sida). Vi lämnar knappen avstängd.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.')
      setPhase('asking')
    }
  }

  if (phase === 'idle') {
    return (
      <Button ref={triggerRef} variant="secondary" aria-label={ariaLabel} onClick={() => setPhase('asking')}>
        {label}
      </Button>
    )
  }

  return (
    <div
      role="group"
      aria-label="Bekräfta radering"
      className="w-full space-y-4 rounded-2xl border border-blush-300 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && phase === 'asking') cancel()
      }}
    >
      <div className="space-y-1">
        <p className="font-medium text-blush-100">{question}</p>
        <p className="text-sm text-blush-300">{warning ?? 'Det går inte att ångra.'}</p>
      </div>
      {error && (
        <p role="alert" className="text-blush-100">
          ⚠ {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" autoFocus onClick={cancel} disabled={phase === 'working'}>
          Avbryt
        </Button>
        <Button variant="danger" onClick={confirm} disabled={phase === 'working'}>
          {phase === 'working' ? 'Raderar…' : confirmLabel}
        </Button>
      </div>
    </div>
  )
}
