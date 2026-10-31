import { plural } from '@/lib/format'
import type { StatsQuestion } from '@/lib/types'

// Svar per fråga: en stapel per alternativ.
// Stapeln är bara dekoration. Siffrorna finns alltid som text, och rätt svar märks med text.
export function QuestionStats({ question }: { question: StatsQuestion }) {
  return (
    <section
      aria-labelledby={`q-${question.id}`}
      className="space-y-4 rounded-2xl border border-blush-300/20 bg-plum-900 p-5"
    >
      <div className="space-y-1">
        <h3 id={`q-${question.id}`} className="text-lg break-words text-blush-100">
          {question.position}. {question.text}
        </h3>
        <p className="text-sm text-blush-300">{plural(question.answerCount, 'svar', 'svar')}</p>
      </div>

      <ul className="space-y-4">
        {question.options.map((o) => (
          <li key={o.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 break-words text-blush-100">
                {o.text}
                {o.isCorrect && (
                  <span className="ml-2 rounded-full border border-blush-300/60 px-2 py-0.5 text-xs text-blush-300">
                    ✓ Rätt svar
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm text-blush-100 tabular-nums">
                {o.count} ({o.percent} %)
              </span>
            </div>
            <div aria-hidden="true" className="h-2.5 w-full overflow-hidden rounded-full bg-plum-950">
              <div
                className={`h-full rounded-full ${o.isCorrect ? 'bg-blush-300' : 'bg-mauve-500'}`}
                style={{ width: `${o.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
