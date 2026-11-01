import Link from "next/link";
import { HeroQuiz } from "@/components/home/hero-quiz";
import { buttonStyles } from "@/components/ui/button";

// Startsidan. Allt innehåll är påhittat (testprojekt).

const steps = [
  {
    title: "Skapa",
    text: "Skriv 3 till 5 frågor, välj en färg och markera rätt svar.",
  },
  {
    title: "Dela",
    text: "Du får en länk som fungerar i mobilen. Skicka den eller lägg den på din sida.",
  },
  {
    title: "Samla",
    text: "Efter quizet kan besökaren lämna namn och e-post. Du ser alla leads i din översikt.",
  },
];

const features = [
  {
    title: "Poängen räknas på servern",
    text: "Besökaren får aldrig se rätt svar i förväg, så ingen kan fuska.",
  },
  {
    title: "Samtycke som går att visa upp",
    text: "Varje lead sparas med den samtyckestext som besökaren godkände.",
  },
  {
    title: "Radera en person direkt",
    text: "Vill någon ta tillbaka sitt samtycke tar du bort namn och e-post med ett klick. Statistiken finns kvar utan personuppgifter.",
  },
  {
    title: "Export till Excel",
    text: "Hämta alla leads som en CSV-fil som öppnas direkt i Excel, med å, ä och ö rätt.",
  },
  {
    title: "Pausa och ändra",
    text: "Pausa quizet när kampanjen är slut. Ändra texter och färg utan att tappa gamla resultat.",
  },
  {
    title: "Statistik per fråga",
    text: "Se hur många som deltog och hur de svarade på varje fråga.",
  },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="font-serif text-2xl text-blush-100">
          QuizBloom
        </Link>
        <nav aria-label="Konto" className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/admin/login"
            className="inline-flex min-h-11 items-center px-3 text-blush-300 whitespace-nowrap underline-offset-4 hover:text-blush-100 hover:underline"
          >
            Logga in
          </Link>
          <Link
            href="/admin/register"
            className="inline-flex min-h-11 items-center rounded-xl border border-blush-300/60 px-4 text-blush-100 whitespace-nowrap transition-colors hover:bg-plum-900"
          >
            Skapa konto
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
          <div className="space-y-8">
            <h1 className="text-4xl leading-tight text-blush-100 sm:text-5xl lg:text-6xl">
              Låt besökarna svara. Du får kontakterna.
            </h1>
            <p className="max-w-prose text-lg leading-relaxed text-blush-100">
              Bygg ett quiz på några minuter, dela länken och samla in namn och
              e-post från de som vill höra av sig. Allt med samtycke, så att du
              kan följa GDPR.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/register" className={buttonStyles("primary")}>
                Skapa ditt första quiz
              </Link>
              <Link href="/admin/login" className={buttonStyles("secondary")}>
                Logga in
              </Link>
            </div>
          </div>
          <div className="flex lg:justify-end">
            <HeroQuiz />
          </div>
        </section>

        <section
          aria-labelledby="steps-title"
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 lg:py-20"
        >
          <h2 id="steps-title" className="mb-10 text-3xl text-blush-100">
            Från idé till lead i tre steg
          </h2>
          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-blush-300/40 pt-6">
                <span
                  aria-hidden="true"
                  className="font-serif text-5xl text-blush-300"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 text-2xl text-blush-100">{step.title}</h3>
                <p className="mt-2 max-w-sm leading-relaxed text-blush-100">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="features-title"
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 lg:py-20"
        >
          <h2 id="features-title" className="mb-10 max-w-xl text-3xl text-blush-100">
            Byggt för att du ska kunna lita på siffrorna och på datan
          </h2>
          <ul className="grid gap-x-16 md:grid-cols-2">
            {features.map((f) => (
              <li key={f.title} className="border-t border-blush-300/20 py-6">
                <h3 className="text-xl text-blush-100">{f.title}</h3>
                <p className="mt-2 max-w-md leading-relaxed text-blush-300">
                  {f.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="cta-title"
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 lg:py-24"
        >
          <div className="space-y-6 rounded-3xl border border-blush-300/30 bg-plum-900 px-6 py-12 sm:px-12">
            <h2 id="cta-title" className="max-w-xl text-3xl text-blush-100 sm:text-4xl">
              Redo att göra ditt första quiz?
            </h2>
            <p className="max-w-prose text-lg text-blush-100">
              Det tar några minuter att komma igång. Du behöver bara en
              e-postadress.
            </p>
            <Link href="/admin/register" className={buttonStyles("primary")}>
              Skapa konto
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-blush-300/20 pt-6 text-sm text-blush-300">
          <p>QuizBloom är ett testprojekt. Allt innehåll är påhittat.</p>
          <nav aria-label="Sidfot" className="flex gap-6">
            <Link href="/admin/login" className="underline-offset-4 hover:text-blush-100 hover:underline">
              Logga in
            </Link>
            <Link href="/admin/register" className="underline-offset-4 hover:text-blush-100 hover:underline">
              Skapa konto
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
