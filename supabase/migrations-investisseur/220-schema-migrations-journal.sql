-- 220 — Journal des migrations (projet CERDIA uniquement). Permet de SAVOIR depuis la base quelles
-- migrations sont appliquées. CONVENTION : chaque NOUVELLE migration finit désormais par s'auto-enregistrer
-- ici (voir CLAUDE.md). Idempotent. NB : base DISTINCTE de C-Secur360 (table propre à ce projet).

create table if not exists schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);

-- Backfill : migrations 1→219 + horodatées (confirmées appliquées 2026-06-14). Numéros « trous » inclus
-- (sans effet). Numérotation CERDIA non paddée (1,2,…219) -> on enregistre en clair.
insert into schema_migrations (version)
  select g::text from generate_series(1, 219) g
on conflict (version) do nothing;

insert into schema_migrations (version) values ('20250122'), ('20250127'), ('220')
on conflict (version) do nothing;

NOTIFY pgrst, 'reload schema';
