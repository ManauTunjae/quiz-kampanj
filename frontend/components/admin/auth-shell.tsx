import type { ReactNode } from 'react'

// Samma ram runt alla inloggningssidor: liten rubrik och en smal kolumn.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-2 text-center">
        <p className="text-sm tracking-widest text-blush-300 uppercase">Admin</p>
        <p className="font-serif text-4xl text-blush-100">QuizBloom</p>
      </header>
      {children}
    </main>
  )
}
