-- Migration 001: kampanjer får en ägare (owner_id).
-- Kör i Supabase: SQL Editor → New query → klistra in → Run.
-- Gör så här:
--   1. Byt 'DIN-EPOST@exempel.se' nedan till e-posten för kontot som ska äga dina gamla kampanjer.
--   2. Kör hela filen.
-- Stämmer inte e-posten (kontot finns inte) stoppar filen med ett felmeddelande och ändrar inget.

alter table campaigns
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Koppla alla kampanjer som saknar ägare till ditt konto
update campaigns
set owner_id = (select id from auth.users where email = 'DIN-EPOST@exempel.se')
where owner_id is null;

-- Säkerhetskoll: ingen kampanj får sakna ägare nu
do $$
begin
  if exists (select 1 from campaigns where owner_id is null) then
    raise exception 'Några kampanjer saknar fortfarande ägare. Kontrollera e-postadressen ovan (kontot måste finnas i Authentication → Users).';
  end if;
end $$;

alter table campaigns alter column owner_id set not null;

create index if not exists campaigns_owner_idx on campaigns (owner_id);
