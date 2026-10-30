import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import HealthCheck from "./health-check";

const swatches = [
  { name: "plum-950", className: "bg-plum-950" },
  { name: "plum-900", className: "bg-plum-900" },
  { name: "mauve-700", className: "bg-mauve-700" },
  { name: "mauve-500", className: "bg-mauve-500" },
  { name: "blush-300", className: "bg-blush-300" },
  { name: "blush-100", className: "bg-blush-100" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-3">
        <p className="text-sm tracking-widest text-blush-300 uppercase">
          Setup klar
        </p>
        <h1 className="text-5xl leading-tight text-blush-100">QuizBloom</h1>
        <p className="text-lg text-blush-100">
          Frontend kör på port 3000. Typsnitt och färger är på plats.
        </p>
      </header>

      <section className="rounded-2xl border border-blush-300/20 bg-plum-900 p-6">
        <h2 className="mb-4 text-2xl text-blush-100">Färger</h2>
        <ul className="grid grid-cols-3 gap-3">
          {swatches.map((s) => (
            <li key={s.name} className="space-y-1">
              <div
                className={`${s.className} h-12 rounded-lg border border-blush-300/30`}
              />
              <span className="text-xs text-blush-300">{s.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-4">
        <button
          type="button"
          className="min-h-14 w-full rounded-xl border border-blush-300/40 bg-mauve-700 px-6 text-lg font-medium text-blush-100 transition-colors hover:bg-mauve-500"
        >
          Stor knapp (test)
        </button>
        <Link href="/admin" className={`${buttonStyles("secondary")} w-full`}>
          Till admin
        </Link>
        <HealthCheck />
      </div>
    </main>
  );
}
