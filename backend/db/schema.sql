-- QuizBloom – databasschema
-- Kör hela filen i Supabase: SQL Editor → New query → klistra in → Run.
-- Filen kan köras flera gånger (den använder "if not exists").

-- ---------------------------------------------------------------
-- 1. campaigns: en kampanj. "slug" blir den publika länken.
-- ---------------------------------------------------------------
create table if not exists campaigns (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (char_length(title) between 1 and 120),
  accent_color text not null default '#E3B6B1'
               check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 2. questions: 3–5 frågor per kampanj (position 1–5)
-- ---------------------------------------------------------------
create table if not exists questions (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  position    int  not null check (position between 1 and 5),
  text        text not null check (char_length(text) between 1 and 300),
  unique (campaign_id, position)
);

-- ---------------------------------------------------------------
-- 3. options: svarsalternativ. Exakt ETT alternativ är rätt.
-- ---------------------------------------------------------------
create table if not exists options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  position    int  not null check (position between 1 and 6),
  text        text not null check (char_length(text) between 1 and 200),
  is_correct  boolean not null default false,
  unique (question_id, position)
);

-- Max ett rätt svar per fråga (databasen skyddar oss).
create unique index if not exists options_one_correct_per_question
  on options (question_id) where is_correct;

-- ---------------------------------------------------------------
-- 4. submissions: en besökare som har svarat klart = en deltagare
-- ---------------------------------------------------------------
create table if not exists submissions (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  score       int  not null check (score >= 0),
  total       int  not null check (total between 1 and 5),
  created_at  timestamptz not null default now(),
  check (score <= total)
);

-- ---------------------------------------------------------------
-- 5. answers: vad besökaren valde på varje fråga
-- ---------------------------------------------------------------
create table if not exists answers (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  option_id     uuid not null references options(id) on delete cascade,
  unique (submission_id, question_id)
);

-- ---------------------------------------------------------------
-- 6. leads: namn + e-post + samtycke (GDPR)
--    Vi sparar EXAKT vilken text personen godkände (consent_text).
--    "consent = true" tvingas av databasen: inget samtycke = ingen lead.
-- ---------------------------------------------------------------
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references submissions(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  email         text not null check (char_length(email) between 3 and 254),
  consent       boolean not null check (consent = true),
  consent_text  text not null,
  consent_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Index för snabba sökningar i dashboarden
-- ---------------------------------------------------------------
create index if not exists questions_campaign_idx   on questions (campaign_id);
create index if not exists options_question_idx     on options (question_id);
create index if not exists submissions_campaign_idx on submissions (campaign_id);
create index if not exists answers_submission_idx   on answers (submission_id);
create index if not exists answers_question_idx     on answers (question_id);

-- ---------------------------------------------------------------
-- Säkerhet: Row Level Security (RLS) PÅ för alla tabeller.
-- Vi skapar medvetet INGA policies. Då kan ingen använda
-- den publika (anon) nyckeln för att läsa eller skriva.
-- Bara vår backend kommer åt datan, med den hemliga nyckeln.
-- ---------------------------------------------------------------
alter table campaigns   enable row level security;
alter table questions   enable row level security;
alter table options     enable row level security;
alter table submissions enable row level security;
alter table answers     enable row level security;
alter table leads       enable row level security;
