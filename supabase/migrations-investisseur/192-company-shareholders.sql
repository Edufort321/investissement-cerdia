-- 192 — Livre d'entreprise : registre des actionnaires + souscriptions signées électroniquement.
-- Signature dessinée (image data URL) + horodatage (date/heure/seconde) + empreinte SHA-256 du document
-- (valeur probante au Québec — Loi concernant le cadre juridique des TI). RLS : réservé aux admins.

create table if not exists public.company_shareholders (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid,
  -- Actionnaire
  full_name              text not null,
  title                  text,
  email                  text,
  address                text,
  -- Participation
  share_class            text default 'Ordinaire',
  shares_count           integer,
  shares_pct             numeric(7,4),          -- % d'action
  purchase_cost          numeric(14,2),         -- coût d'achat total
  price_per_share        numeric(14,4),
  currency               text default 'CAD',
  -- Clauses légales du certificat / convention
  legal_clauses          text,
  -- Signatures électroniques (data URL image) + horodatage + IP
  shareholder_signature  text,
  shareholder_signed_at  timestamptz,
  shareholder_ip         text,
  president_name         text,
  president_title        text default 'Président',
  president_signature    text,
  president_signed_at     timestamptz,
  -- Intégrité : empreinte SHA-256 du contenu signé
  document_hash          text,
  effective_date         date,
  status                 text default 'signed', -- draft | signed | cancelled
  created_by             text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_shareholders_org on public.company_shareholders (organization_id, created_at desc);

alter table public.company_shareholders enable row level security;

-- Lecture/écriture réservées aux administrateurs (super_admin / org_admin) via leur profil.
drop policy if exists "shareholders admin all" on public.company_shareholders;
create policy "shareholders admin all" on public.company_shareholders
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','org_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','org_admin')));

-- Aucune lecture anonyme.
revoke all on public.company_shareholders from anon;
