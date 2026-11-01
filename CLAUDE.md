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

## Inloggning med användare (Supabase Auth + cookie)

- Användare och lösenord finns i Supabase Auth (`auth.users`). Vi sparar aldrig lösenord själva.
- `SESSION_SECRET`, `SUPABASE_SECRET_KEY` och `SUPABASE_PUBLISHABLE_KEY` ligger i `backend/.env`.
  (`ADMIN_PASSWORD` används inte längre.)
- Registrering och inloggning går via backend (`database/supabase-auth.ts`, publishable-nyckeln).
  Skapa en NY klient per anrop. Dela aldrig en inloggad klient mellan besökare.
- `POST /auth/register`, `POST /auth/login`: vid lyckat resultat sätts en **signerad** httpOnly-cookie
  `qb_session` med `setSignedCookie` (Hono). Cookien har användarens id, e-post och tid. Aldrig lösenord eller token.
- `POST /auth/logout` tar bort cookien. `GET /auth/me` svarar `{ loggedIn, user }`.
- Middleware `requireUser` på `/api/admin/*` läser cookien och sätter `c.get('user')`. Annars `401`.
- Samma felmeddelande för fel lösenord och okänd e-post. Registrering avslöjar inte om ett konto redan finns.
- E-postbekräftelse: stöds (`needsConfirmation`), men är avstängd i Supabase medan vi bygger och testar.
- Spärrar: 5 felaktiga inloggningar per 15 min och IP, 10 registreringar per timme och IP.
- Cookie-inställningar: `httpOnly: true`, `sameSite: 'Lax'`, `path: '/'`,
  `secure: true` bara i produktion, `maxAge` 8 timmar.

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

Regler för inskickade svar:
- Poängen räknas ALLTID på servern. Frontend skickar bara `questionId` + `optionId`.
- Rätt svar (`is_correct`) lämnar aldrig servern, inte ens efter att quizet är klart.
- Exakt ett svar per fråga, och alternativet måste höra till frågan, annars 400.
- Max 60 inskickningar per 10 min och IP (`lib/rate-limit.ts`) → annars 429 + `Retry-After`.
- Postman: skicka Body → raw → JSON (annars stoppar csrf-skyddet med 403).

Regler för ägarskap (admin):
- Varje kampanj har en ägare (`campaigns.owner_id`). Ägaren sätts av servern från inloggningen, aldrig från klienten.
- ALLA admin-frågor mot databasen måste filtrera på `owner_id` (kampanjer) eller kontrollera ägaren först (statistik, leads). Backend använder secret-nyckeln och går förbi RLS, så filtret är det enda skyddet.
- Någon annans kampanj ger `404` (samma svar som en kampanj som inte finns), aldrig `403`.
- Publika routes (`/api/campaigns/:slug`, svar, lead) är oförändrade: alla besökare kan använda en kampanjlänk.
- Nya admin-routes ska testas med två användare (se `owner-test`-idén: A ska aldrig se B:s data).
- Databasändringar för befintliga databaser ligger i `backend/db/migrations/`.

Regler för dashboarden (admin):
- `GET /api/admin/campaigns/:id/stats` och `GET /api/admin/campaigns/:id/leads?limit=100&offset=0` kräver inloggning.
- Leads innehåller personuppgifter: svaret har `Cache-Control: no-store`, och e-post/namn loggas aldrig.
- Antal räknas med `count` i databasen (inte genom att hämta alla rader). Leads hämtas i sidor (max 500).
- Admin ser `isCorrect` per alternativ. Besökare ser det aldrig.

Regler för leads (namn, e-post, samtycke):
- Samtyckestexten finns på ETT ställe: `backend/src/lib/consent.ts`. Frontend visar texten som kommer i svaret från `POST .../submissions` (`consentText`) och skriver aldrig egen text.
- Servern sparar samma text i `leads.consent_text`. Klienten kan inte bestämma text eller tid.
- `consent` måste vara exakt `true`. Namn och e-post trimmas, e-post görs till gemener.
- En lead per deltagare: andra försöket ger 409. Okänd deltagare ger 404.
- Personuppgifter (namn, e-post) loggas aldrig och skickas aldrig tillbaka i svar.
- Max 30 leads per 10 min och IP → annars 429.

Regler för dashboarden (frontend):
- Sidan `/admin/campaigns/[id]` ligger i `(protected)`: inloggning kontrolleras i layouten, och 401 från API:t skickar till `/admin/login`.
- Staplarna är bara dekoration. Antal och procent står alltid som text, och rätt svar märks med texten "Rätt svar" (aldrig bara färg).
- Leads hämtas 50 åt gången ("Visa fler"). E-post visas som `mailto:`-länk.

Regler för inloggning (frontend):
- Sidorna `/admin/login` och `/admin/register` använder samma komponent (`components/admin/auth-form.tsx`). Felmeddelandena kommer från servern.
- `(protected)/layout.tsx` kontrollerar `GET /auth/me` och visar "Inloggad som <e-post>". Inte inloggad skickas till `/admin/login`.

Regler för resultatet (frontend):
- Poängen kommer från servern. Frontend räknar aldrig själv.
- Konfetti ritas på canvas (`components/quiz/confetti.tsx`, inga extra paket) i palettens färger.
- Med "minska rörelse" (`prefers-reduced-motion`) visas ingen konfetti och `animate-pop` är nästan avstängd.

Auth:
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

Admin (kräver cookie):
- `GET /api/admin/campaigns`, `POST /api/admin/campaigns`
- `GET /api/admin/campaigns/:id/stats`, `GET /api/admin/campaigns/:id/leads`

### Glömt lösenord och e-postbekräftelse
- Mejlen skickas av Supabase med standardmallarna (mallarna kan inte ändras utan egen SMTP). Länken går via Supabase till vår frontend (`/admin/reset-password`, `/admin/confirm`) med `#access_token=...` i adressen. Frontend läser den i webbläsaren (`lib/auth-link.ts`), rensar adressen och skickar nyckeln till backend först när användaren trycker på knappen.
- Backend kontrollerar nyckeln med `auth.getUser(accessToken)` och avslutar sedan Supabase-sessionen (`admin.signOut(token, 'global')`), så nyckeln fungerar bara en gång. `redirectTo` måste stå under Redirect URLs i Supabase.
- `forgot-password` och `resend-confirmation` svarar ALLTID 200 för okända e-postadresser (avslöjar inte vilka som har konto). Samma regel som registrering.
- `reset-password`: `getUser` och sedan `auth.admin.updateUserById` med den hemliga nyckeln. Användaren loggas inte in, hen loggar in med det nya lösenordet. `confirm` loggar in användaren.
- Gamla inloggnings-cookies gäller upp till 8 timmar även efter att lösenordet bytts.
- Logga aldrig e-post, lösenord eller nycklar från länken.

### Ändra och pausa kampanj
- `PATCH /api/admin/campaigns/:id` ändrar titel, färg, `isActive` och TEXTER. Slug (den publika länken) ändras aldrig.
- Antal frågor, antal alternativ och vilket svar som är rätt går INTE att ändra. Annars stämmer inte gamla poäng och statistik. Frågor och alternativ skickas med sina id:n, och de måste vara exakt de som finns.
- `strictObject` i zod: okända fält (t.ex. `isCorrect`, `slug`) ger 400.
- Pausad kampanj (`is_active = false`): publik GET och inskick av svar ger **410**, utan frågor. Den som redan svarat kan fortfarande spara sin lead. Data finns kvar.
- CORS måste tillåta `PATCH` (finns i `index.ts`).

### Export till CSV
- `GET /api/admin/campaigns/:id/leads.csv`. Ägarkontroll som vanligt (annars 404). Max 10 exporter per 10 minuter och användare.
- Semikolon som avskiljare och BOM först (svenska Excel). Tider i svensk tid. Byggs i `lib/csv.ts`.
- CSV-injektion: text som börjar med `= + - @` får ett `'` framför. Ändra aldrig det. Namn kommer från besökare.
- `Cache-Control: no-store`. Logga aldrig innehållet. CORS exponerar `Content-Disposition`.

### Radera data (GDPR)
- `DELETE /api/admin/campaigns/:id/leads/:leadId` raderar bara leaden (namn och e-post). Deltagaren och svaren är anonyma och finns kvar.
- `DELETE /api/admin/campaigns/:id` raderar kampanjen. Databasen raderar resten via `on delete cascade`.
- Båda kollar ägaren. Någon annans data ger 404 (samma som "finns inte"). Logga aldrig personuppgifter.
- Frontend ska alltid fråga "Är du säker?" före radering.

## Datamodell (Supabase)

- `campaigns`: id, slug (unik), title, accent_color, owner_id (→ auth.users), created_at
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
