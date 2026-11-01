# QuizBloom

Ett övningsprojekt: en quiz-kampanj med lead-formulär.

- En admin skapar en kampanj (titel, färg och 3–5 frågor).
- Besökaren öppnar en publik länk och svarar på en fråga i taget.
- Poängen räknas på servern. Besökaren får ett resultatkort med konfetti.
- Besökaren kan lämna namn och e-post med GDPR-samtycke.
- Admin skapar ett konto och loggar in (Supabase Auth).
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
   - Har du en äldre databas? Kör filerna i `backend/db/migrations/` i ordning: `001_campaign_owner.sql` (läs instruktionen överst: du byter e-postadress till ditt konto) och sedan `002_campaign_active.sql` (pausa kampanjer).
   - Vill du ha testdata: registrera ett konto i appen först (`/admin/register`). Klistra sedan in `backend/db/seed.sql` och kör. Då får du kampanjen `demo-hostquiz`, som ägs av det första kontot.

3. **Skapa `backend/.env`.** Kopiera `backend/.env.example` till `backend/.env` och fyll i värdena själv (se tabellen nedan). Filen `.env` pushas aldrig till GitHub.

   Under Authentication i Supabase: slå på Email-inloggning. Medan du bygger och testar kan du stänga av **Confirm email** och sätta Site URL till `http://localhost:3000`.

4. **Skapa `frontend/.env.local`.** Kopiera `frontend/.env.example`. Där finns inga hemligheter.

5. **Starta:**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:8000 (testa: http://localhost:8000/health)
   - Frontend: http://localhost:3000

> Starta om backend när du ändrar `backend/.env`. Den läser inte om filen själv.

## E-post: glömt lösenord och bekräftelse

Supabase skickar mejlen med sina egna standardmallar (på engelska). Med Supabases inbyggda mejltjänst går det inte att ändra mallarna. Det kräver egen SMTP. Se [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Så fungerar det: länken i mejlet går först till Supabase. Supabase kontrollerar den och skickar användaren till vår frontend (`/admin/reset-password` eller `/admin/confirm`) med en åtkomstnyckel efter `#` i adressen. Frontend läser nyckeln, tar bort den ur adressfältet och skickar den till backend först när användaren trycker på knappen.

Gör så här i Supabase:

1. **Authentication → URL Configuration:** sätt **Site URL** till `http://localhost:3000`.
2. Under **Redirect URLs**: lägg till `http://localhost:3000/**`. Utan den hamnar användaren på startsidan med ett fel i adressen.
3. **Authentication → Sign In / Providers → Email:** slå på **Confirm email** när du vill kräva bekräftelse.

**Begränsningar vid test (inbyggd mejltjänst):**
- Mejl skickas bara till adresser som är medlemmar i ditt Supabase-team (din egen adress fungerar), och högst **2 mejl per timme**. Andra adresser får "Email address not authorized".
- Vissa mejlprogram (t.ex. Outlook/Hotmail) öppnar länkar i förväg för att skanna dem. Då är engångskoden förbrukad och du får `otp_expired`. Sidan visar då ett svenskt felmeddelande. Begär ett nytt mejl, eller öppna länken direkt från mejlet utan att något annat hunnit öppna den.
- För riktig drift behövs egen mejltjänst (Custom SMTP). Då kan man också ändra mallarna.

## Miljövariabler (`backend/.env`)

| Namn | Vad det är |
| --- | --- |
| `PORT` | Port för backend. Standard `8000`. |
| `FRONTEND_ORIGIN` | Adressen till frontend, exakt `http://localhost:3000`. Används för CORS och csrf-skydd. |
| `SESSION_SECRET` | Minst 32 tecken. Skapa med `openssl rand -base64 32`. Signerar inloggningscookien. |
| `SUPABASE_URL` | Projektets URL (Project Settings → API). |
| `SUPABASE_SECRET_KEY` | Den hemliga nyckeln. Används bara i backend. **Aldrig i frontend, aldrig i git.** |
| `SUPABASE_PUBLISHABLE_KEY` | Den publicerbara nyckeln. Används bara för att registrera och logga in användare. |

Servern startar inte om något viktigt värde saknas. Då visas ett tydligt felmeddelande.

## Så använder du appen

1. Gå till http://localhost:3000/admin/register och skapa ett konto (e-post och lösenord, minst 8 tecken). Därefter loggar du in på http://localhost:3000/admin/login.
2. Skapa en kampanj under **Ny kampanj**.
3. Under **Kampanjer** kan du kopiera den publika länken (`/q/<slug>`) och öppna **Visa statistik**.
4. Öppna länken, t.ex. http://localhost:3000/q/demo-hostquiz, och svara på quizet.
5. Under **Redigera** kan du rätta titel, färg och texter. Med **Pausa kampanjen** får besökare ett meddelande i stället för quizet. Du kan aktivera den igen när du vill.
6. Under **Leads** på statistiksidan finns **Exportera CSV**. Filen öppnas i Excel. Den innehåller personuppgifter, så spara den säkert och lägg den aldrig i git.
7. Glömt lösenordet? Tryck **Glömt lösenordet?** på inloggningssidan.
8. Under **Visa statistik** kan du radera en lead (en persons uppgifter) eller hela kampanjen. Det går inte att ångra.

## Mappar

```
quiz-kampanj/
├── backend/
│   ├── db/               schema.sql, seed.sql och migrations/ (körs i Supabase)
│   ├── tests/            automatiska tester (Vitest)
│   └── src/
│       ├── app.ts        bygger appen (routes, cors, skydd). index.ts startar den.
│       ├── config/       miljövariabler
│       ├── database/     Supabase-klienten
│       ├── routes/       tunna routes (ta emot, validera, svara)
│       ├── services/     affärslogik och databasfrågor
│       ├── validation/   zod-scheman
│       ├── middleware/   t.ex. kontroll av inloggning
│       ├── lib/          sessionscookie, spärrar mot spam, samtyckestext
│       └── utils/        små hjälpfunktioner
├── frontend/
│   ├── tests/            automatiska tester (Vitest)
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
| `GET /api/campaigns/:slug` | Kampanj med frågor och alternativ (utan rätt svar). **410** om kampanjen är pausad. |
| `POST /api/campaigns/:slug/submissions` | Skicka alla svar. Servern räknar poängen. |
| `POST /api/submissions/:id/lead` | Spara namn, e-post och samtycke |

Inloggning:

| Metod och adress | Vad den gör |
| --- | --- |
| `POST /auth/register` | Skapa konto (Supabase Auth). Loggar in direkt om e-postbekräftelse är av. |
| `POST /auth/login` | Logga in med e-post och lösenord. Sätter en httpOnly-cookie. |
| `POST /auth/logout` | Logga ut |
| `GET /auth/me` | Är jag inloggad? Vem? |
| `POST /auth/forgot-password` | Skicka mejl med länk för nytt lösenord. Svarar alltid 200. |
| `POST /auth/reset-password` | Byt lösenord med koden (`tokenHash`) från mejlet |
| `POST /auth/confirm` | Bekräfta e-post med koden från mejlet. Loggar in direkt. |
| `POST /auth/resend-confirmation` | Skicka bekräftelsemejlet igen. Svarar alltid 200. |

Admin (kräver inloggning):

| Metod och adress | Vad den gör |
| --- | --- |
| `GET /api/admin/campaigns` | Lista kampanjer |
| `POST /api/admin/campaigns` | Skapa kampanj |
| `GET /api/admin/campaigns/:id` | Hela kampanjen med rätt svar (för redigering) |
| `PATCH /api/admin/campaigns/:id` | Ändra titel, färg, texter eller pausa (`isActive`). Antal frågor och rätt svar kan inte ändras. |
| `GET /api/admin/campaigns/:id/stats` | Statistik per fråga |
| `GET /api/admin/campaigns/:id/leads` | Leads (`?limit=50&offset=0`) |
| `GET /api/admin/campaigns/:id/leads.csv` | Hämta alla leads som CSV-fil (max 10 per 10 min) |
| `DELETE /api/admin/campaigns/:id/leads/:leadId` | Radera en lead (namn och e-post). Deltagaren och svaren finns kvar. |
| `DELETE /api/admin/campaigns/:id` | Radera kampanjen och allt som hör till den |

## Testa API:t i Postman

- Skicka alltid **Body → raw → JSON** på POST, PATCH och DELETE, även `{}`. Utan det svarar csrf-skyddet med **403**.
- Använd `localhost`, aldrig `127.0.0.1`. Annars skickas inte cookien.
- Logga in först (`POST /auth/login`). Postman sparar cookien själv.
- Admin-routes ger **401** utan inloggning.
- CSV-export: i Postman, tryck på pilen bredvid **Send** och välj **Send and Download** för att spara filen.

## Säkerhet och GDPR

- Hemligheter finns bara i `.env` (som ignoreras av git). `.env.example` har tomma värden.
- Rätt svar skickas aldrig till besökaren. Poängen räknas på servern.
- Användare och lösenord ligger i Supabase Auth. Vi sparar inga lösenord. Cookien innehåller användarens id och e-post (signerad), aldrig lösenord eller token.
- Spärrar mot spam: max 5 felaktiga inloggningar per 15 minuter, 10 nya konton per timme, 5 mejl per timme (glömt lösenord, nytt bekräftelsemejl), 10 försök med mejlkod per 15 minuter, 60 inskickade quiz och 30 leads per 10 minuter och IP-adress.
- Samtyckestexten finns på ett ställe (`backend/src/lib/consent.ts`). Texten som besökaren godkände sparas tillsammans med varje lead.
- Namn och e-post loggas aldrig och skickas aldrig tillbaka i svar. Leads-svaren för admin cachas inte.
- Varje kampanj har en ägare. Admin-routes filtrerar på inloggad användare, och någon annans kampanj ger 404.
- Supabase-tabellerna har RLS påslaget utan policies. Bara backend (med den hemliga nyckeln) kommer åt dem.

## Vanliga problem

| Problem | Lösning |
| --- | --- |
| Backend startar inte och klagar på saknade värden | Fyll i `backend/.env` och starta om |
| 400 vid registrering | Supabase godkänner inte alla adresser (t.ex. `example.com`). Använd en riktig e-postadress. Se felkoden i backend-terminalen. |
| Länken i mejlet ger `otp_expired` eller landar på startsidan | Koden gäller en gång och en timme, och mejlprogram kan öppna den i förväg. Kontrollera att `http://localhost:3000/**` står under Redirect URLs, och begär ett nytt mejl. |
| "Email address not authorized" eller inget mejl kommer | Supabase inbyggda mejl går bara till teamets medlemmar och max 2 per timme. Använd din egen adress, eller koppla en egen mejltjänst. |
| 429 vid registrering | Supabase begränsar antalet registreringar per timme. Vänta en stund. |
| `403 Forbidden` i Postman | Body → raw → JSON (t.ex. `{}`) |
| Inloggningen "fastnar" i webbläsaren | Öppna `http://localhost:3000`, inte `127.0.0.1` |
| CORS-fel i konsolen | Kontrollera `FRONTEND_ORIGIN` (exakt `http://localhost:3000`) och starta om backend |
| Filer som heter t.ex. `package 2.json` | iCloud-konfliktkopior. De ignoreras av git och kan raderas. |
| Konstiga fel efter `git pull` | Kör `npm run install:all` igen |
| Port 3000 eller 8000 är upptagen | Stäng den gamla processen |

## Automatiska tester

Testerna kontrollerar att viktiga saker alltid fungerar, utan att du behöver klicka i Postman. De använder **aldrig** din riktiga `.env` eller din riktiga Supabase (de har egna låtsasvärden i `vitest.config.ts`).

```bash
npm test                      # alla tester (backend + frontend), från rotmappen
npm test --prefix backend     # bara backend
npm test --prefix frontend    # bara frontend
npm run test:watch --prefix backend   # kör om testerna varje gång du sparar
```

Vad testas:
- **Backend, enhet** (`backend/tests/unit`): CSV-skyddet mot formler, slugify, spärrarna mot spam, alla valideringsregler.
- **Backend, services** (`backend/tests/services`): poängräkning på servern, pausad kampanj, rätt svar läcker aldrig till besökaren. Databasen byts mot en låtsasversion (`tests/helpers/fake-supabase.ts`).
- **Backend, routes** (`backend/tests/routes`): alla admin-adresser ger 401 utan inloggning, ägarskap (annans kampanj ger 404), CORS, csrf, CSV-rubriker, 410 vid pausad kampanj, inloggning, spärrar, glömt lösenord. Services byts mot låtsasfunktioner.
- **Frontend** (`frontend/tests`): hjälpfunktioner och knappen "Är du säker?" (ConfirmDelete).

Tester som INTE finns ännu: riktig Supabase (inloggning, mejl) och hela flödet i en riktig webbläsare. De testar du själv i Postman och webbläsaren.

**Ny admin-route?** Lägg in den i listan `adminRoutes` i `backend/tests/routes/security.test.ts`, så vet du att den kräver inloggning.

På GitHub kör `.github/workflows/ci.yml` typkontroll, lint och tester automatiskt vid varje pull request.

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
- Registrering och inloggning med Supabase Auth
- Ägarskap: varje användare ser bara sina egna kampanjer, statistik och leads
- Radera en lead eller en hel kampanj (GDPR), med frågan "Är du säker?"
- Glömt lösenord, e-postbekräftelse och "skicka mejlet igen" (kräver mejlmallarna i Supabase, se avsnittet E-post)
- Redigera kampanj (titel, färg, texter) och pausa/aktivera den
- Export av leads till CSV (öppnas i Excel)
- Automatiska tester (Vitest) och CI på GitHub

På gång / idéer:
- Publicering (deploy)
