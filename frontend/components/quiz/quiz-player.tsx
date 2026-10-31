'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Confetti } from '@/components/quiz/confetti'
import { ProgressBar } from '@/components/quiz/progress-bar'
import { QuestionView } from '@/components/quiz/question-view'
import { ResultCard } from '@/components/quiz/result-card'
import { Button } from '@/components/ui/button'
import { ApiError, getPublicCampaign, submitAnswers } from '@/lib/api'
import { plural } from '@/lib/format'
import type { PublicCampaign, SubmissionResult } from '@/lib/types'

type Load =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; campaign: PublicCampaign }

type Phase = 'intro' | 'quiz' | 'done'

const DEFAULT_ACCENT = '#E3B6B1'
const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

// Samma ram runt alla vyer: smal kolumn, mobile first.
function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6">{children}</main>
  )
}

// ---------- Hämtar kampanjen och visar rätt vy ----------
export function QuizPlayer({ slug }: { slug: string }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getPublicCampaign(slug)
      .then((campaign) => {
        if (active) setLoad({ status: 'ready', campaign })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) {
          setLoad({ status: 'notfound' })
        } else {
          setLoad({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Något gick fel.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [slug, attempt])

  if (load.status === 'loading') {
    return (
      <Shell>
        <p role="status" className="my-auto text-center text-blush-300">
          Laddar quiz…
        </p>
      </Shell>
    )
  }

  if (load.status === 'notfound') {
    return (
      <Shell>
        <div className="my-auto space-y-4 text-center">
          <h1 className="text-3xl text-blush-100">Den här kampanjen finns inte</h1>
          <p className="text-blush-300">Kontrollera att länken är rätt, eller fråga den som skickade den.</p>
        </div>
      </Shell>
    )
  }

  if (load.status === 'error') {
    return (
      <Shell>
        <div role="alert" className="my-auto space-y-4 text-center">
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
      </Shell>
    )
  }

  return <Quiz campaign={load.campaign} />
}

// ---------- Själva quizet: intro → en fråga i taget → klart ----------
function Quiz({ campaign }: { campaign: PublicCampaign }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  // frågans id → valt alternativs id. Sparas bara i webbläsaren än så länge.
  const [answers, setAnswers] = useState<Record<string, string>>({})
  // Resultatet kommer från servern (poängen räknas aldrig i webbläsaren)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const total = campaign.questions.length
  const question = campaign.questions[index]
  const answered = campaign.questions.filter((q) => answers[q.id] !== undefined).length
  const accent = isHexColor(campaign.accentColor) ? campaign.accentColor : DEFAULT_ACCENT

  // Flytta fokus till frågan när vi byter steg, så att tangentbord och skärmläsare följer med.
  useEffect(() => {
    if (phase !== 'intro') headingRef.current?.focus({ preventScroll: true })
  }, [phase, index])

  function next() {
    if (index < total - 1) {
      setSubmitError(null)
      setDirection('forward')
      setIndex(index + 1)
    } else {
      void submit()
    }
  }

  // Skickar alla svar till servern. Går det fel kan man trycka på knappen igen.
  async function submit() {
    if (submitting) return // skydd mot dubbelklick
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = campaign.questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] }))
      setResult(await submitAnswers(campaign.slug, payload))
      setPhase('done')
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Något gick fel. Försök igen.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function back() {
    if (index > 0) {
      setDirection('back')
      setIndex(index - 1)
    }
  }

  function restart() {
    setAnswers({})
    setResult(null)
    setSubmitError(null)
    setIndex(0)
    setDirection('forward')
    setPhase('intro')
  }

  // ----- Intro -----
  if (phase === 'intro') {
    return (
      <Shell>
        <div className="my-auto animate-fade-in space-y-8 text-center">
          {/* Kampanjens accentfärg: bara en liten dekoration, aldrig text */}
          <span
            aria-hidden="true"
            className="mx-auto block h-1 w-16 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <h1 className="text-4xl leading-tight text-blush-100">{campaign.title}</h1>
          {total > 0 ? (
            <>
              <p className="text-lg text-blush-300">
                {plural(total, 'fråga', 'frågor')}. Ett svar per fråga.
              </p>
              <Button className="min-h-14 w-full text-lg" onClick={() => setPhase('quiz')}>
                Starta quiz
              </Button>
            </>
          ) : (
            <p className="text-lg text-blush-300">Den här kampanjen har inga frågor än.</p>
          )}
        </div>
      </Shell>
    )
  }

  // ----- Klart: resultat + konfetti -----
  if (phase === 'done' && result) {
    return (
      <Shell>
        <Confetti />
        <header className="space-y-4 pb-8">
          <p className="text-sm tracking-widest text-blush-300 uppercase">{campaign.title}</p>
          <ProgressBar done={total} total={total} />
        </header>
        <div className="my-auto space-y-8 text-center">
          <ResultCard
            score={result.score}
            total={result.total}
            accent={accent}
            headingRef={headingRef}
          />
          {/* Lead-formulär (namn, e-post, GDPR) byggs i nästa feature. */}
          <Button variant="secondary" onClick={restart}>
            Börja om
          </Button>
        </div>
      </Shell>
    )
  }

  // ----- En fråga i taget -----
  const selectedId = answers[question.id]
  const isLast = index === total - 1

  return (
    <Shell>
      <header className="space-y-4 pb-8">
        <p className="text-sm tracking-widest text-blush-300 uppercase">{campaign.title}</p>
        <ProgressBar done={answered} total={total} />
      </header>

      {/* "key" gör att en ny fråga monteras på nytt, och då spelas animationen */}
      <div key={question.id} className={direction === 'forward' ? 'animate-slide-in' : 'animate-slide-in-back'}>
        <QuestionView
          question={question}
          number={index + 1}
          total={total}
          selectedId={selectedId}
          onSelect={(optionId) => setAnswers((prev) => ({ ...prev, [question.id]: optionId }))}
          headingRef={headingRef}
        />
      </div>

      {submitError && (
        <p role="alert" className="mt-6 rounded-xl border border-blush-300/60 px-4 py-3 text-center text-blush-100">
          {submitError}
        </p>
      )}

      <div className="mt-auto flex gap-3 pt-8">
        {index > 0 && (
          <Button variant="secondary" disabled={submitting} onClick={back}>
            Tillbaka
          </Button>
        )}
        <Button className="min-h-14 flex-1 text-lg" disabled={!selectedId || submitting} onClick={next}>
          {isLast ? (submitting ? 'Skickar…' : 'Slutför') : 'Nästa fråga'}
        </Button>
      </div>
    </Shell>
  )
}
