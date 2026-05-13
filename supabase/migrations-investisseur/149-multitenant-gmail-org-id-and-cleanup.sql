-- ============================================================
-- Migration 149 : Multi-Tenant — Gmail invoices + Cleanup helpers
--
-- Derniere migration de la Phase 1 (fondations DB multi-tenant) :
--
--   1. Ajoute organization_id + FK + index + RLS sur gmail_invoices
--   2. Drop les helpers temporaires _migration_146/147 (ils ne sont plus
--      necessaires apres 149 — convergence DB atteinte)
--   3. Recap global Phase 1
--
-- ⚠ Apres cette migration, TOUTES les tables des modules :
--    - Investissement immobilier (~56 tables)
--    - Commerce + Invoicing (6 tables)
--    - Gmail (1 table)
--   ... ont organization_id NOT NULL + FK + index + policy tenant_isolation.
--
-- ⚠ Les tables amazon_* RESTENT CERDIA-only (pas de org_id, pas tenant-aware)
--   par choix : c'est l'agent proprietaire CERDIA Voyage, pas une feature SaaS.
-- ============================================================

BEGIN;


-- ── 1. Prerequis ─────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_migration_146_add_org_id') THEN
        RAISE EXCEPTION '[149] Helper _migration_146_add_org_id absent. Appliquer mig 146 d''abord.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_migration_147_apply_tenant_rls') THEN
        RAISE EXCEPTION '[149] Helper _migration_147_apply_tenant_rls absent. Appliquer mig 147 d''abord.';
    END IF;
END $$;


-- ── 2. Gmail invoices : org_id + RLS ────────────────────────
SELECT _migration_146_add_org_id('gmail_invoices');
SELECT _migration_147_apply_tenant_rls('gmail_invoices');


-- ── 3. Cleanup : drop les helpers temporaires ───────────────
-- La Phase 1 DB est terminee. Les helpers ne sont plus necessaires.
-- Si on en a besoin a nouveau (ex: ajout d'un nouveau module avec
-- plusieurs tables tenant-scoped), on les re-creera dans la mig
-- correspondante.
DROP FUNCTION IF EXISTS _migration_146_add_org_id(TEXT);
DROP FUNCTION IF EXISTS _migration_147_apply_tenant_rls(TEXT);


-- ── 4. Verification finale gmail_invoices ───────────────────
SELECT
    'gmail_invoices' AS table_name,
    (SELECT COUNT(*) FROM information_schema.columns
      WHERE table_schema='public' AND table_name='gmail_invoices' AND column_name='organization_id') AS has_org_id,
    (SELECT COUNT(*) FROM pg_constraint
      WHERE conname='fk_gmail_invoices_organization')                                                AS has_fk,
    (SELECT COUNT(*) FROM pg_indexes
      WHERE schemaname='public' AND indexname='idx_gmail_invoices_organization')                     AS has_index,
    (SELECT COUNT(*) FROM pg_policies
      WHERE schemaname='public' AND tablename='gmail_invoices' AND policyname='tenant_isolation')    AS has_rls;


-- ── 5. Recap global Phase 1 ─────────────────────────────────
SELECT
    'PHASE 1 — Fondations DB multi-tenant'                                  AS milestone,
    (SELECT COUNT(*) FROM organizations)                                    AS organizations_total,
    (SELECT COUNT(*) FROM profiles)                                         AS profiles_total,
    (SELECT COUNT(*) FROM profiles WHERE role = 'super_admin')              AS super_admins,
    (SELECT COUNT(DISTINCT table_name)
       FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'organization_id')    AS tables_tenant_scoped,
    (SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public' AND policyname = 'tenant_isolation')      AS rls_policies_applied;


-- ── 6. Sanity check final ───────────────────────────────────
DO $$
DECLARE
    eric_uid     UUID;
    is_super     BOOLEAN;
    n_orgs       INT;
    n_tenant_tbl INT;
BEGIN
    SELECT id INTO eric_uid FROM auth.users WHERE email = 'eric.dufort@cerdia.ai' LIMIT 1;
    SELECT public.is_super_admin(eric_uid) INTO is_super;
    SELECT COUNT(*) INTO n_orgs FROM organizations;
    SELECT COUNT(*) INTO n_tenant_tbl
      FROM pg_policies
      WHERE schemaname = 'public' AND policyname = 'tenant_isolation';

    IF eric_uid IS NULL THEN
        RAISE EXCEPTION '[149] CRITIQUE : Eric introuvable dans auth.users';
    END IF;
    IF NOT is_super THEN
        RAISE EXCEPTION '[149] CRITIQUE : Eric n''est pas super_admin';
    END IF;
    IF n_orgs < 1 THEN
        RAISE EXCEPTION '[149] CRITIQUE : aucune organisation seedee';
    END IF;
    IF n_tenant_tbl < 40 THEN
        RAISE EXCEPTION '[149] CRITIQUE : seulement % tables ont tenant_isolation (attendu >= 40)', n_tenant_tbl;
    END IF;

    RAISE NOTICE '[149] ✅ Phase 1 DB validee : Eric=super_admin, % organisations, % tables tenant-isolated.', n_orgs, n_tenant_tbl;
END $$;


COMMIT;
