'use client'

import { useState } from 'react'
import { ProgressBar } from '@/components/quiz/progress-bar'

// Ett litet demo-quiz på startsidan. Allt här är påhittat och körs bara i webbläsaren.
// (Det riktiga quizet hämtar frågor från backend och skickar aldrig rätt svar i förväg.)
const QUESTION = 'Vilken färg får du om du blandar rött och blått?'
const OPTIONS = ['Lila', 'Grön', 'Orange']
const CORRECT_INDEX = 0

export function HeroQuiz() {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null

  function pick(index: number) {
    if (!answered) setPicked(index)
  }

  return (
    <section
      aria-labelledby="demo-title"
      className="animate-fade-in w-full max-w-md space-y-6 rounded-3xl border border-blush-300/30 bg-plum-900 p-6 sm:p-8"
    >
      <div className="space-y-3">
        <p id="demo-title" className="text-sm text-blush-300">
          Prova ett quiz
        </p>
        <ProgressBar done={answered ? 1 : 0} total={1} />
      </div>

      <h2 className="text-2xl leading-snug text-blush-100">{QUESTION}</h2>

      <div role="group" aria-label="Svarsalternativ" className="space-y-3">
        {OPTIONS.map((text, index) => {
          const isPicked = picked === index
          const isCorrect = index === CORRECT_INDEX
          const state = !answered ? '' : isCorrect ? 'Rätt svar' : isPicked ? 'Ditt svar' : ''
          const style = !answered
            ? 'border-blush-300/40 hover:bg-mauve-700'
            : isCorrect
              ? 'border-blush-100 bg-mauve-700'
              : isPicked
                ? 'border-blush-300 border-dashed'
                : 'border-blush-300/20 opacity-70'
          return (
            <button
              key={text}
              type="button"
              onClick={() => pick(index)}
              aria-disabled={answered}
              className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-5 text-left text-lg text-blush-100 transition-colors ${style} ${answered ? 'cursor-default' : ''}`}
            >
              <span>{text}</span>
              {state && <span className="text-sm text-blush-100">{isCorrect ? `✓ ${state}` : state}</span>}
            </button>
          )
        })}
      </div>

      <div role="status" className="min-h-12 text-blush-300">
        {answered &&
          (picked === CORRECT_INDEX
            ? 'Rätt! Så här ser det ut för dina besökare.'
            : 'Nästan. Rätt svar är lila. Så här ser det ut för dina besökare.')}
      </div>

      {answered && (
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="text-blush-300 underline underline-offset-4 hover:text-blush-100"
        >
          Prova igen
        </button>
      )}
    </section>
  )
}
