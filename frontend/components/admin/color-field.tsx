'use client'

import { useId } from 'react'
import { inputStyles } from '@/components/ui/text-field'

export const DEFAULT_ACCENT = '#E3B6B1'
export const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

// Färgväljare + textfält för färgkoden (t.ex. #E3B6B1)
export function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium text-blush-100">
        Accentfärg
      </label>
      <p className="text-sm text-blush-300">Används till små detaljer i kampanjen, aldrig till text.</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label="Välj färg"
          value={isHexColor(value) ? value.toLowerCase() : DEFAULT_ACCENT.toLowerCase()}
          onChange={(e) => onChange(e.target.value)}
          className="size-12 shrink-0 cursor-pointer rounded-xl border border-blush-300/60 bg-plum-950 p-1"
        />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          className={`${inputStyles} max-w-40 font-mono`}
        />
      </div>
    </div>
  )
}
