# QuizBloom

Ett övningsprojekt: en quiz-kampanj med lead-formulär.

- En admin skapar en kampanj (titel, färg och 3–5 frågor).
- Besökaren öppnar en publik länk och svarar på en fråga i taget.
- Poängen räknas på servern. Besökaren får ett resultatkort med konfetti.
- Besökaren kan lämna namn och e-post med GDPR-samtycke.
- Admin ser en dashboard: antal deltagare, svar per fråga och en lista med leads.

> Bara påhittad testdata ska användas. Använd t.ex. `anna@example.com`.

## Teknik

| Del | Teknik |
| --- | --- |
| Backend (`backend/`, port 8000) | Hono, TypeScript, zod |
| Databas | Supabase (Postgres) |
| Frontend (`frontend/`, port 3000) | Next.js (App Router), Tailwind CSS 4 |
| Start | `concurrently` i roten startar båda med ett kommando |

Frontend pratar bara med backend. Den pratar aldrig direkt med Supabase.

## Det här behöver du

- Node.js (version 20 eller nyare) och npm
- Ett gratis Supabase-projekt
- Postman (valfritt, för att testa API:t)

## Kom igång

1. **Installera allt** (kör i projektets rotmapp):
   ```bash
   npm run install:all
   ```

2. **Skapa databasen.** I Supabase: SQL Editor → New query.
   - Klistra in `backend/db/schema.sql` och kör.
   - Vill du ha testdata: klistra in `backend/db/seed.sql` och kör. Då får du kampanjen `demo-hostquiz`.

3. **Skapa `backend/.env`.** Kopiera `backend/.env.example` till `backend/.env` och fyll i värdena själv (se tabellen nedan). Filen `.env` pushas aldrig till GitHub.

4. **Skapa `frontend/.env.local`.** Kopiera `frontend/.env.example`. Där finns inga hemligheter.

5. **Starta:**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:8000 (testa: http://localhost:8000/health)
   - Frontend: http://localhost:3000

> Starta om backend när du ändrar `backend/.env`. Den läser inte om filen själv.

## Miljövariabler (`backend/.env`)

| Namn | Vad det är |
| --- | --- |
| `PORT` | Port för backend. Standard `8000`. |
| `FRONTEND_ORIGIN` | Adressen till frontend, exakt `http://localhost:3000`. Används för CORS och csrf-skydd. |
| `ADMIN_PASSWORD` | Lösenordet för admin-inloggningen. |
| `SESSION_SECRET` | Minst 32 tecken. Skapa med `openssl rand -base64 32`. |
| `SUPABASE_URL` | Projektets URL (Project Settings → API). |
| `SUPABASE_SECRET_KEY` | Den hemliga nyckeln. Används bara i backend. **Aldrig i frontend, aldrig i git.** |

Servern startar inte om något viktigt värde saknas. Då visas ett tydligt felmeddelande.

## Så använder du appen

1. Gå till http://localhost:3000/admin/login och logga in.
2. Skapa en kampanj under **Ny kampanj**.
3. Under **Kampanjer** kan du kopiera den publika länken (`/q/<slug>`) och öppna **Visa statistik**.
4. Öppna länken, t.ex. http://localhost:3000/q/demo-hostquiz, och svara på quizet.

## Mappar

```
quiz-kampanj/
├── backend/
│   ├── db/               schema.sql och seed.sql (körs i Supabase)
│   └── src/
│       ├── config/       miljövariabler
│       ├── database/     Supabase-klienten
│       ├── routes/       tunna routes (ta emot, validera, svara)
│       ├── services/     affärslogik och databasfrågor
│       ├── validation/   zod-scheman
│       ├── middleware/   t.ex. kontroll av inloggning
│       ├── lib/          sessionscookie, spärrar mot spam, samtyckestext
│       └── utils/        små hjälpfunktioner
├── frontend/
│   ├── app/              sidor (/admin, /q/[slug])
│   ├── components/       ui/, quiz/, admin/
│   └── lib/              api.ts (alla anrop till backend), types.ts, format.ts
├── CLAUDE.md             projektets regler (för Claude Code)
└── README.md
```

## API (kort)

Publikt, ingen inloggning:

| Metod och adress | Vad den gör |
| --- | --- |
| `GET /api/campaigns/:slug` | Kampanj med frågor och alternativ (utan rätt svar) |
| `POST /api/campaigns/:slug/submissions` | Skicka alla svar. Servern räknar poängen. |
| `POST /api/submissions/:id/lead` | Spara namn, e-post och samtycke |

Inloggning:

| Metod och adress | Vad den gör |
| --- | --- |
| `POST /auth/login` | Logga in. Sätter en httpOnly-cookie. |
| `POST /auth/logout` | Logga ut |
| `GET /auth/me` | Är jag inloggad? |

Admin (kräver inloggning):

| Metod och adress | Vad den gör |
| --- | --- |
| `GET /api/admin/campaigns` | Lista kampanjer |
| `POST /api/admin/campaigns` | Skapa kampanj |
| `GET /api/admin/campaigns/:id/stats` | Statistik per fråga |
| `GET /api/admin/campaigns/:id/leads` | Leads (`?limit=50&offset=0`) |

## Testa API:t i Postman

- Skicka alltid **Body → raw → JSON** på POST, även `{}`. Utan det svarar csrf-skyddet med **403**.
- Använd `localhost`, aldrig `127.0.0.1`. Annars skickas inte cookien.
- Logga in först (`POST /auth/login`). Postman sparar cookien själv.
- Admin-routes ger **401** utan inloggning.

## Säkerhet och GDPR

- Hemligheter finns bara i `.env` (som ignoreras av git). `.env.example` har tomma värden.
- Rätt svar skickas aldrig till besökaren. Poängen räknas på servern.
- Spärrar mot spam: max 5 felaktiga inloggningar per 15 minuter, 60 inskickade quiz och 30 leads per 10 minuter och IP-adress.
- Samtyckestexten finns på ett ställe (`backend/src/lib/consent.ts`). Texten som besökaren godkände sparas tillsammans med varje lead.
- Namn och e-post loggas aldrig och skickas aldrig tillbaka i svar. Leads-svaren för admin cachas inte.
- Supabase-tabellerna har RLS påslaget utan policies. Bara backend (med den hemliga nyckeln) kommer åt dem.

## Vanliga problem

| Problem | Lösning |
| --- | --- |
| Backend startar inte och klagar på saknade värden | Fyll i `backend/.env` och starta om |
| `403 Forbidden` i Postman | Body → raw → JSON (t.ex. `{}`) |
| Inloggningen "fastnar" i webbläsaren | Öppna `http://localhost:3000`, inte `127.0.0.1` |
| CORS-fel i konsolen | Kontrollera `FRONTEND_ORIGIN` (exakt `http://localhost:3000`) och starta om backend |
| Filer som heter t.ex. `package 2.json` | iCloud-konfliktkopior. De ignoreras av git och kan raderas. |
| Konstiga fel efter `git pull` | Kör `npm run install:all` igen |
| Port 3000 eller 8000 är upptagen | Stäng den gamla processen |

## Så jobbar vi (git)

- En feature = en branch = en pull request (backend och frontend i samma PR).
- Ordning per feature: backend, test i Postman, frontend, test i webbläsaren.
- Branch-namn: `feature/<namn>`. Små commits med tydliga meddelanden.

## Status

Klart:
- Setup och databas
- Skapa kampanj (admin)
- Publikt quiz
- Resultat med poäng på servern, resultatkort och konfetti
- Lead-formulär med GDPR-samtycke
- Admin-dashboard (statistik och leads)

På gång / idéer:
- Riktig inloggning med Supabase Auth (flera användare, varje användare ser bara sina kampanjer)
- Radera lead eller kampanj (GDPR)
- Export av leads till CSV
- Publicering (deploy)
