'use client'

import type { Ref } from 'react'
import type { PublicQuestion } from '@/lib/types'

type QuestionViewProps = {
  question: PublicQuestion
  number: number
  total: number
  selectedId: string | undefined
  onSelect: (optionId: string) => void
  headingRef: Ref<HTMLHeadingElement>
}

// En fråga med stora svarsalternativ. Alternativen är riktiga radioknappar (dolda
// visuellt), så tangentbord (piltangenter) och skärmläsare fungerar utan extra kod.
export function QuestionView({
  question,
  number,
  total,
  selectedId,
  onSelect,
  headingRef,
}: QuestionViewProps) {
  const headingId = `question-${question.id}`

  return (
    <section aria-labelledby={headingId}>
      <p className="mb-2 text-sm tracking-widest text-blush-300 uppercase">
        Fråga {number} av {total}
      </p>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="mb-6 text-3xl leading-snug text-blush-100 outline-none"
      >
        {question.text}
      </h2>

      <div role="radiogroup" aria-labelledby={headingId} className="space-y-3">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="group flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border border-blush-300/60 bg-plum-900 px-5 py-3 text-lg text-blush-100 transition-colors hover:bg-mauve-700/60 has-checked:border-blush-300 has-checked:bg-mauve-700 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-blush-300"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={selectedId === option.id}
              onChange={() => onSelect(option.id)}
              className="sr-only"
            />
            {/* Rund markering som fylls när alternativet är valt */}
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-blush-300 transition-colors group-has-checked:bg-blush-300"
            >
              <span className="hidden size-2.5 rounded-full bg-plum-950 group-has-checked:block" />
            </span>
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
