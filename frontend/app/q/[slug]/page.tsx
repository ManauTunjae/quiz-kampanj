import { Suspense } from 'react'
import { QuizPlayer } from '@/components/quiz/quiz-player'

// Publik quiz-sida: /q/<slug>. Ingen inloggning.
// Med Cache Components måste "await params" ligga inuti en <Suspense>.
export default function QuizPage(props: PageProps<'/q/[slug]'>) {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center px-4">
          <p role="status" className="text-blush-300">
            Laddar quiz…
          </p>
        </main>
      }
    >
      <QuizFromParams params={props.params} />
    </Suspense>
  )
}

async function QuizFromParams({ params }: { params: PageProps<'/q/[slug]'>['params'] }) {
  const { slug } = await params
  return <QuizPlayer slug={slug} />
}
