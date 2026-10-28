'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { Button, buttonStyles } from '@/components/ui/button'
import { inputStyles, TextField } from '@/components/ui/text-field'
import { ApiError, createCampaign } from '@/lib/api'
import type { CreatedCampaign } from '@/lib/types'

const MIN_QUESTIONS = 3
const MAX_QUESTIONS = 5
const MIN_OPTIONS = 2
const MAX_OPTIONS = 4
const DEFAULT_COLOR = '#E3B6B1'

// ---------- Formulärets tillstånd ----------
type OptionDraft = { id: number; text: string }
type QuestionDraft = { id: number; text: string; options: OptionDraft[]; correctId: number | null }

// Unika id:n för nycklar (key) och radio-grupper. Formuläret visas bara i webbläsaren.
let idCounter = 0
const newId = () => ++idCounter

const newQuestion = (): QuestionDraft => ({
  id: newId(),
  text: '',
  options: [
    { id: newId(), text: '' },
    { id: newId(), text: '' },
  ],
  correctId: null,
})

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

// Samma regler som backend. Backend kontrollerar alltid igen.
function validate(title: string, accent: string, questions: QuestionDraft[]): string[] {
  const problems: string[] = []
  if (!title.trim()) problems.push('Titel saknas.')
  if (!isHexColor(accent)) problems.push('Färgen ska se ut så här: #E3B6B1.')

  questions.forEach((q, qi) => {
    const nr = qi + 1
    if (!q.text.trim()) problems.push(`Fråga ${nr}: skriv en fråga.`)
    q.options.forEach((o, oi) => {
      if (!o.text.trim()) problems.push(`Fråga ${nr}, alternativ ${oi + 1}: skriv ett svar.`)
    })
    if (q.correctId === null) problems.push(`Fråga ${nr}: välj vilket svar som är rätt.`)
  })
  return problems
}

// Gör om ett serverfel som "questions.1.options" till text: "Fråga 2: ..."
function describeIssue(path: string, message: string): string {
  const match = path.match(/^questions\.(\d+)/)
  return match ? `Fråga ${Number(match[1]) + 1}: ${message}` : message
}

export function CampaignForm({ onCreateAnother }: { onCreateAnother: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [accent, setAccent] = useState(DEFAULT_COLOR)
  const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
    Array.from({ length: MIN_QUESTIONS }, newQuestion)
  )
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<CreatedCampaign | null>(null)
  const errorsRef = useRef<HTMLDivElement>(null)

  // Flytta fokus till felrutan så att skärmläsare och tangentbord hittar den
  useEffect(() => {
    if (errors.length > 0) errorsRef.current?.focus()
  }, [errors])

  // ---------- Ändra frågor och alternativ ----------
  const changeQuestion = (qid: number, change: (q: QuestionDraft) => QuestionDraft) =>
    setQuestions((qs) => qs.map((q) => (q.id === qid ? change(q) : q)))

  const addQuestion = () => setQuestions((qs) => [...qs, newQuestion()])
  const removeQuestion = (qid: number) => setQuestions((qs) => qs.filter((q) => q.id !== qid))

  const addOption = (qid: number) =>
    changeQuestion(qid, (q) => ({ ...q, options: [...q.options, { id: newId(), text: '' }] }))

  const removeOption = (qid: number, oid: number) =>
    changeQuestion(qid, (q) => ({
      ...q,
      options: q.options.filter((o) => o.id !== oid),
      correctId: q.correctId === oid ? null : q.correctId,
    }))

  // ---------- Skicka ----------
  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    const problems = validate(title, accent, questions)
    if (problems.length > 0) {
      setErrors(problems)
      return
    }

    setErrors([])
    setSubmitting(true)
    try {
      const result = await createCampaign({
        title: title.trim(),
        accentColor: accent,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          options: q.options.map((o) => ({ text: o.text.trim(), isCorrect: o.id === q.correctId })),
        })),
      })
      setCreated(result)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (err instanceof ApiError) {
        setErrors([err.message, ...err.issues.map((i) => describeIssue(i.path, i.message))])
      } else {
        setErrors(['Något gick fel. Försök igen.'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- Klart: visa länken ----------
  if (created) {
    return (
      <section
        aria-labelledby="created-title"
        className="space-y-5 rounded-2xl border border-blush-300/20 bg-plum-900 p-6"
      >
        <h2 id="created-title" className="text-2xl text-blush-100">
          Kampanjen är skapad ✓
        </h2>
        <p className="text-blush-100">
          <strong className="font-semibold">{created.title}</strong> har fått den här länken:
        </p>
        <p className="rounded-xl bg-plum-950 px-4 py-3 font-mono text-sm break-all text-blush-300">
          {created.publicPath}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <CopyLinkButton slug={created.slug} />
          <Link href="/admin" className={buttonStyles('primary')}>
            Till kampanjerna
          </Link>
          <Button variant="ghost" onClick={onCreateAnother}>
            Skapa en till
          </Button>
        </div>
      </section>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      // Gamla felmeddelanden försvinner så fort man ändrar något
      onChange={() => {
        if (errors.length > 0) setErrors([])
      }}
      noValidate
      className="space-y-8"
    >
      {errors.length > 0 && (
        <div
          ref={errorsRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-blush-300 bg-plum-900 p-4"
        >
          <p className="font-semibold text-blush-100">Det här behöver rättas:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-blush-100">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- Titel och färg ---------- */}
      <section className="space-y-5 rounded-2xl border border-blush-300/20 bg-plum-900 p-5">
        <TextField
          label="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Till exempel: Höstquiz om naturen"
          autoComplete="off"
        />

        <div className="space-y-2">
          <label htmlFor="accent-hex" className="block text-base font-medium text-blush-100">
            Accentfärg
          </label>
          <p className="text-sm text-blush-300">
            Används till små detaljer i kampanjen, aldrig till text.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Välj färg"
              value={isHexColor(accent) ? accent.toLowerCase() : DEFAULT_COLOR.toLowerCase()}
              onChange={(e) => setAccent(e.target.value)}
              className="size-12 shrink-0 cursor-pointer rounded-xl border border-blush-300/60 bg-plum-950 p-1"
            />
            <input
              id="accent-hex"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              className={`${inputStyles} max-w-40 font-mono`}
            />
          </div>
        </div>
      </section>

      {/* ---------- Frågor ---------- */}
      {questions.map((q, qi) => (
        <fieldset
          key={q.id}
          className="space-y-4 rounded-2xl border border-blush-300/20 bg-plum-900 p-5"
        >
          <legend className="px-2 text-lg font-semibold text-blush-300">Fråga {qi + 1}</legend>

          <input
            aria-label={`Fråga ${qi + 1}`}
            value={q.text}
            onChange={(e) => changeQuestion(q.id, (old) => ({ ...old, text: e.target.value }))}
            maxLength={300}
            placeholder="Skriv frågan här"
            autoComplete="off"
            className={inputStyles}
          />

          <div className="space-y-3">
            <p className="text-sm text-blush-300">
              Skriv svarsalternativ. Markera det som är rätt.
            </p>
            {q.options.map((o, oi) => (
              <div key={o.id} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctId === o.id}
                  onChange={() => changeQuestion(q.id, (old) => ({ ...old, correctId: o.id }))}
                  aria-label={`Alternativ ${oi + 1} i fråga ${qi + 1} är rätt svar`}
                  className="size-6 shrink-0 cursor-pointer accent-blush-300"
                />
                <input
                  aria-label={`Alternativ ${oi + 1}, fråga ${qi + 1}`}
                  value={o.text}
                  onChange={(e) =>
                    changeQuestion(q.id, (old) => ({
                      ...old,
                      options: old.options.map((x) =>
                        x.id === o.id ? { ...x, text: e.target.value } : x
                      ),
                    }))
                  }
                  maxLength={200}
                  placeholder={`Alternativ ${oi + 1}`}
                  autoComplete="off"
                  className={inputStyles}
                />
                {q.options.length > MIN_OPTIONS && (
                  <Button
                    variant="ghost"
                    onClick={() => removeOption(q.id, o.id)}
                    aria-label={`Ta bort alternativ ${oi + 1} i fråga ${qi + 1}`}
                    className="px-2"
                  >
                    Ta bort
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => addOption(q.id)}
              disabled={q.options.length >= MAX_OPTIONS}
            >
              + Alternativ
            </Button>
            {questions.length > MIN_QUESTIONS && (
              <Button variant="ghost" onClick={() => removeQuestion(q.id)}>
                Ta bort fråga {qi + 1}
              </Button>
            )}
          </div>
        </fieldset>
      ))}

      <div className="space-y-4">
        <Button
          variant="secondary"
          onClick={addQuestion}
          disabled={questions.length >= MAX_QUESTIONS}
          className="w-full sm:w-auto"
        >
          + Lägg till fråga
        </Button>
        <p className="text-sm text-blush-300">
          {questions.length} av {MAX_QUESTIONS} frågor. Du behöver minst {MIN_QUESTIONS}.
        </p>
      </div>

      <Button type="submit" disabled={submitting} className="min-h-14 w-full text-lg">
        {submitting ? 'Sparar…' : 'Skapa kampanj'}
      </Button>
    </form>
  )
}
