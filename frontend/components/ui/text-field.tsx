'use client'

import { useId, type InputHTMLAttributes } from 'react'

// border blush-300 med 60 % styrka ger ca 4:1 mot plum-900 (kravet för formulärfält är 3:1)
export const inputStyles =
  'min-h-12 w-full rounded-xl border border-blush-300/60 bg-plum-950 px-4 text-base text-blush-100 placeholder:text-blush-300/70'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}

// Ett fält med synlig label (labeln är kopplad till fältet med id/htmlFor)
export function TextField({ label, hint, className = '', ...props }: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium text-blush-100">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-blush-300">
          {hint}
        </p>
      )}
      <input
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className={`${inputStyles} ${className}`}
        {...props}
      />
    </div>
  )
}
