-- Migration 002: en kampanj kan pausas (is_active).
-- Kör i Supabase: SQL Editor → New query → klistra in → Run.
-- Filen kan köras flera gånger. Befintliga kampanjer blir aktiva (true).

alter table campaigns
  add column if not exists is_active boolean not null default true;
