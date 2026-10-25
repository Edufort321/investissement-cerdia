-- =====================================================================
-- 225 — Portfolio artiste : verrouillage des écritures anonymes (ÉTAPE 2/2)
-- =====================================================================
-- ⚠️ À APPLIQUER SEULEMENT APRÈS le déploiement Vercel du code qui utilise les RPC
--    de la mig.224 (page /portfolio/fill/[token] + route /api/portfolio/fill-upload).
--    Avant ce déploiement, l'ancienne page perdrait la sauvegarde et les uploads.
-- Effets :
--   • anon : plus AUCUNE écriture directe sur portfolio_profiles / portfolio_items
--            (le lien passe par les RPC à jeton) ; lecture publique des vitrines publiées conservée.
--   • portfolio_items : la policy « FOR ALL TO anon, authenticated USING (true) » est supprimée.
--   • storage « portfolio » (+ « documents/portfolio/% ») : écriture réservée aux gestionnaires
--     (super_admin / org_admin / org_commerce). Les artistes uploadent via la route serveur
--     /api/portfolio/fill-upload qui valide le jeton (service_role côté serveur seulement).
--   • Lecture publique des fichiers conservée (vitrines publiques).
-- Idempotent.
-- =====================================================================

begin;

-- ── portfolio_profiles ──────────────────────────────────────────────
drop policy if exists "portfolio_fill_token_update" on public.portfolio_profiles;
drop policy if exists "portfolio_fill_token_read"   on public.portfolio_profiles;
revoke insert, update, delete on table public.portfolio_profiles from anon;

-- ── portfolio_items ─────────────────────────────────────────────────
drop policy if exists "portfolio_items_fill_token" on public.portfolio_items;
revoke insert, update, delete on table public.portfolio_items from anon;

-- ── storage : bucket « portfolio » ─────────────────────────────────
drop policy if exists "portfolio_bucket_upload" on storage.objects;
drop policy if exists "portfolio_bucket_update" on storage.objects;
drop policy if exists "portfolio_bucket_delete" on storage.objects;

create policy "portfolio_bucket_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio' and public.can_manage_portfolio());
create policy "portfolio_bucket_update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'portfolio' and public.can_manage_portfolio())
  with check (bucket_id = 'portfolio' and public.can_manage_portfolio());
create policy "portfolio_bucket_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and public.can_manage_portfolio());

-- ── storage : ancien emplacement « documents/portfolio/% » (mig.175) ──
drop policy if exists "portfolio_storage_upload" on storage.objects;
drop policy if exists "portfolio_storage_update" on storage.objects;
drop policy if exists "portfolio_storage_delete" on storage.objects;

create policy "portfolio_storage_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and name like 'portfolio/%' and public.can_manage_portfolio());
create policy "portfolio_storage_update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'documents' and name like 'portfolio/%' and public.can_manage_portfolio())
  with check (bucket_id = 'documents' and name like 'portfolio/%' and public.can_manage_portfolio());
create policy "portfolio_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and name like 'portfolio/%' and public.can_manage_portfolio());

insert into schema_migrations (version) values ('225') on conflict (version) do nothing;

commit;

-- ── Vérification (doit montrer : aucune policy anon en écriture) ──────
select tablename, policyname, roles, cmd
  from pg_policies
 where (schemaname = 'public' and tablename in ('portfolio_profiles', 'portfolio_items'))
    or (schemaname = 'storage' and policyname like 'portfolio%')
 order by tablename, policyname;
