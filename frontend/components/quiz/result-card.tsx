import type { Ref } from 'react'

type Props = {
  score: number
  total: number
  accent: string
  headingRef?: Ref<HTMLHeadingElement>
}

// Kort text efter hur det gick. Kort och snällt, även vid låg poäng.
function messageFor(score: number, total: number) {
  if (score === total) return 'Alla rätt. Snyggt jobbat!'
  if (score / total >= 0.5) return 'Bra jobbat!'
  return 'Bra försök!'
}

// Resultatkortet "poppar" in med en mjuk scale-animation (animate-pop).
export function ResultCard({ score, total, accent, headingRef }: Props) {
  return (
    <section
      aria-labelledby="result-heading"
      className="animate-pop space-y-5 rounded-3xl border border-blush-300/30 bg-plum-900 px-6 py-10 text-center shadow-2xl shadow-black/40"
    >
      <span
        aria-hidden="true"
        className="mx-auto block h-1 w-16 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <h1
        id="result-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-sm font-normal tracking-widest text-blush-300 uppercase outline-none"
      >
        Ditt resultat
      </h1>
      <p className="font-serif text-7xl leading-none text-blush-100">
        {score}
        <span className="text-blush-300"> / {total}</span>
      </p>
      <p className="text-lg text-blush-100">
        {score} av {total} rätt. {messageFor(score, total)}
      </p>
    </section>
  )
}
