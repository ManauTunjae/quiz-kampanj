# QuizBloom – projektregler för Claude

QuizBloom är ett testprojekt (inte en riktig produkt).
Ideella organisationer skapar quiz-kampanjer. Besökare svarar, ser sitt resultat
och kan lämna namn + e-post med GDPR-samtycke. Admin ser en dashboard.

- Använd ALDRIG namnet eller loggan från ett riktigt företag. Appen heter "QuizBloom".
- Använd bara fejkdata (påhittade namn, `@example.com`-adresser).

## Om användaren

- Användaren är junior utvecklare. Svenska är inte hennes modersmål.
- Förklara varje steg med **enkel svenska och korta meningar**.
- Påminn om fallgropar (CORS, cookies, portar, Supabase-nycklar, m.m.).
- Efter varje backend-steg: ge **steg-för-steg-instruktioner för Postman**.

## Tech stack

| Del | Teknik | Port |
|---|---|---|
| Backend | TypeScript + Hono (`/backend`) | **8000** |
| Databas | Supabase (Postgres) | – |
| Frontend | Next.js App Router + Tailwind CSS 4 (`/frontend`) | **3000** |

- Ett git-repo (monorepo). Root-`package.json` har `concurrently`: `npm run dev` startar båda.
- Validering i backend: `zod` + `@hono/zod-validator`.
- Typsnitt via `next/font`: Playfair Display (rubriker) + Inter (brödtext).

## Arbetsordning

1. Setup av backend och frontend först.
2. Sedan en feature i taget: **backend → Postman-test → frontend → test i webbläsaren**.
3. **En feature = en branch + en PR** (backend och frontend i samma PR).
4. Små steg. Vänta på användarens OK mellan stegen.
5. Användaren kör git-kommandon och skapar PRs själv på GitHub.
   Claude säger till när en branch är klar att pusha och föreslår commit-meddelande.

Branch-namn: `chore/...` för setup, `feature/...` för funktioner.

## Säkerhet och hemligheter

- Lägg ALDRIG hemligheter i koden. Allt hemligt ligger i `.env` (som är git-ignorerad).
- Varje `.env` har en `.env.example` med tomma värden för hemligheter.
- Användaren fyller i `.env` själv. **Be aldrig användaren klistra in nycklar i chatten.**
- Supabase-nyckeln (secret / service_role) finns BARA i `backend/.env`.
  Aldrig i frontend. Aldrig med prefixet `NEXT_PUBLIC_`.
- Frontend pratar ALDRIG direkt med Supabase. Bara via vårt API på port 8000.
- Slå på Row Level Security (RLS) på alla tabeller. Backend använder secret-nyckeln.
- Skicka ALDRIG `is_correct` till besökare. Poängen räknas på servern.

## Admin-login (cookie)

- `ADMIN_PASSWORD` och `SESSION_SECRET` ligger i `backend/.env`.
- `POST /auth/login` kollar lösenordet. Om rätt: sätt en **signerad** httpOnly-cookie
  med `setSignedCookie` (Hono). Cookien innehåller aldrig själva lösenordet.
- `POST /auth/logout` tar bort cookien (`deleteCookie`).
- `GET /auth/me` svarar om man är inloggad (används av frontend).
- En middleware på `/api/admin/*` kollar cookien med `getSignedCookie`. Annars `401`.
- Jämför lösenord med en tidskonstant jämförelse (`timingSafeEqual`).
- Cookie-inställningar: `httpOnly: true`, `sameSite: 'Lax'`, `path: '/'`,
  `secure: true` bara i produktion, `maxAge` t.ex. 8 timmar.

## CORS och cookies mellan port 3000 och 8000

- Hono `cors()` måste ha `origin: 'http://localhost:3000'` (exakt, inte `*`)
  och `credentials: true`.
- Lägg `cors()` FÖRST, före routes och auth-middleware.
- Frontend: varje `fetch` till admin- och auth-routes måste ha `credentials: 'include'`.
- Använd alltid `localhost` – blanda inte med `127.0.0.1` (då skickas inte cookien).
- Admin-sidor hämtar data från klienten (`'use client'`), så att webbläsaren skickar cookien.
- Postman sparar cookies automatiskt per domän (`localhost`).

## API

Publikt:
- `GET /api/campaigns/:slug` – kampanj + frågor + alternativ (utan `is_correct`)
- `POST /api/campaigns/:slug/submissions` – alla svar → `{ submissionId, score, total }`
- `POST /api/submissions/:id/lead` – `{ name, email, consent }`

Auth:
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

Admin (kräver cookie):
- `GET /api/admin/campaigns`, `POST /api/admin/campaigns`
- `GET /api/admin/campaigns/:id/stats`, `GET /api/admin/campaigns/:id/leads`

## Datamodell (Supabase)

- `campaigns`: id, slug (unik), title, accent_color, created_at
- `questions`: id, campaign_id, position, text
- `options`: id, question_id, position, text, is_correct
- `submissions`: id, campaign_id, score, total, created_at
- `answers`: id, submission_id, question_id, option_id
- `leads`: id, submission_id (unik), name, email, consent, consent_text, consent_at, created_at

SQL ligger i `backend/db/schema.sql` och `backend/db/seed.sql`.
Användaren kör dem själv i Supabase SQL Editor.

## Design

Minimal, modern, lugn och lyxig. Mobile first. En fråga i taget. Stora knappar.
Admin-sidor kan vara enklare.

Färger (tokens med `@theme` i `frontend/app/globals.css`):

| Token | Hex | Användning |
|---|---|---|
| plum-950 | #150016 | mörkaste bakgrund |
| plum-900 | #29104A | kort/sektioner |
| mauve-700 | #522C5D | knappar, hover |
| mauve-500 | #845162 | accent, progress bar |
| blush-300 | #E3B6B1 | highlights, ikoner |
| blush-100 | #FFE3D8 | huvudtext |

Bakgrund: gradient från #150016 till #29104A.

Kontrast (WCAG AA):
- OK för text: `blush-100` och `blush-300` på plum-bakgrunder. `blush-100` på `mauve-700`.
- INTE för text: `mauve-500` och `mauve-700` på mörk bakgrund (för låg kontrast).
- Progress bar: gradient `mauve-500` → `blush-300` (så den når minst 3:1).
- Kampanjens egen `accent_color` används bara till detaljer, aldrig till brödtext.

Animationer:
- Fade/slide mellan frågor. Progress bar som fylls.
- Slutet: konfetti i palettens färger + resultatkort med mjuk scale ("pop").
- Respektera `prefers-reduced-motion`: ingen konfetti, inga stora rörelser.
