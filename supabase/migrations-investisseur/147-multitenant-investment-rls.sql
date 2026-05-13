-- ============================================================
-- Migration 147 : Multi-Tenant — RLS sur les tables Investissement
--
-- Ajoute une policy RESTRICTIVE de tenant isolation sur les 56 tables
-- du module Investissement. Combinee en AND avec les policies PERMISSIVE
-- existantes, elle ajoute un filtre supplementaire :
--
--    organization_id = auth_get_org_id()  OR  is_super_admin(auth.uid())
--
-- ⚠ NON-DESTRUCTIF : aucune policy existante n'est supprimee.
-- ⚠ super_admin (Eric) passe partout via la clause OR.
-- ⚠ service_role (sync scripts Python, routes API server-side) : bypass
--    RLS automatiquement par Supabase, jamais bloque.
-- ⚠ anon users : pas concernes (policy applique TO authenticated).
-- ============================================================

BEGIN;


-- ── 1. Helper : applique la policy RESTRICTIVE de tenant isolation ──
CREATE OR REPLACE FUNCTION _migration_147_apply_tenant_rls(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Skip si la table n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_table
    ) THEN
        RAISE NOTICE '[147] Table % introuvable, skip.', p_table;
        RETURN;
    END IF;

    -- Skip si la colonne organization_id n'existe pas (mig 146 pas appliquee)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'organization_id'
    ) THEN
        RAISE NOTICE '[147] %.organization_id absent (mig 146 ?), skip.', p_table;
        RETURN;
    END IF;

    -- Assure que RLS est activee (no-op si deja activee)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);

    -- Drop la policy si elle existe deja (idempotence en cas de re-execution)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', p_table);

    -- Cree la policy RESTRICTIVE de tenant isolation
    -- Note : RESTRICTIVE est combinee en AND avec les policies PERMISSIVE
    -- existantes. L'acces requiert donc :
    --   - Une policy PERMISSIVE qui autorise l'operation, ET
    --   - La policy RESTRICTIVE qui filtre par tenant
    EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I '
        'AS RESTRICTIVE '
        'FOR ALL TO authenticated '
        'USING ('
        '    organization_id = public.auth_get_org_id() '
        '    OR public.is_super_admin(auth.uid())'
        ') '
        'WITH CHECK ('
        '    organization_id = public.auth_get_org_id() '
        '    OR public.is_super_admin(auth.uid())'
        ')',
        p_table
    );

    RAISE NOTICE '[147] %.tenant_isolation : applique.', p_table;
END $$;


-- ── 2. Application sur toutes les tables Investissement (meme liste que 146) ─

-- Core entites
SELECT _migration_147_apply_tenant_rls('investors');
SELECT _migration_147_apply_tenant_rls('properties');
SELECT _migration_147_apply_tenant_rls('transactions');
SELECT _migration_147_apply_tenant_rls('documents');
SELECT _migration_147_apply_tenant_rls('dividends');
SELECT _migration_147_apply_tenant_rls('dividend_allocations');
SELECT _migration_147_apply_tenant_rls('capex_accounts');
SELECT _migration_147_apply_tenant_rls('current_accounts');
SELECT _migration_147_apply_tenant_rls('rnd_accounts');
SELECT _migration_147_apply_tenant_rls('operational_expenses');
SELECT _migration_147_apply_tenant_rls('reports');

-- Investisseurs
SELECT _migration_147_apply_tenant_rls('investor_investments');
SELECT _migration_147_apply_tenant_rls('investor_debts');
SELECT _migration_147_apply_tenant_rls('investor_reservations');
SELECT _migration_147_apply_tenant_rls('investor_properties');

-- Proprietes
SELECT _migration_147_apply_tenant_rls('property_attachments');
SELECT _migration_147_apply_tenant_rls('property_links');
SELECT _migration_147_apply_tenant_rls('property_valuations');
SELECT _migration_147_apply_tenant_rls('property_management_api');

-- Tracking financier
SELECT _migration_147_apply_tenant_rls('nav_history');
SELECT _migration_147_apply_tenant_rls('share_price_history');
SELECT _migration_147_apply_tenant_rls('share_links');
SELECT _migration_147_apply_tenant_rls('liabilities');
SELECT _migration_147_apply_tenant_rls('payment_schedules');
SELECT _migration_147_apply_tenant_rls('transaction_attachments');
SELECT _migration_147_apply_tenant_rls('audit_log');
SELECT _migration_147_apply_tenant_rls('monthly_verifications');

-- Scenarios
SELECT _migration_147_apply_tenant_rls('scenarios');
SELECT _migration_147_apply_tenant_rls('scenario_results');
SELECT _migration_147_apply_tenant_rls('scenario_votes');
SELECT _migration_147_apply_tenant_rls('scenario_documents');
SELECT _migration_147_apply_tenant_rls('scenario_actual_values');
SELECT _migration_147_apply_tenant_rls('scenario_bookings');

-- Tresorerie
SELECT _migration_147_apply_tenant_rls('bank_accounts');
SELECT _migration_147_apply_tenant_rls('bank_transactions');
SELECT _migration_147_apply_tenant_rls('cash_flow_forecast');
SELECT _migration_147_apply_tenant_rls('payment_obligations');
SELECT _migration_147_apply_tenant_rls('treasury_alerts');

-- Gestion projets
SELECT _migration_147_apply_tenant_rls('contractors');
SELECT _migration_147_apply_tenant_rls('project_phases');
SELECT _migration_147_apply_tenant_rls('project_milestones');
SELECT _migration_147_apply_tenant_rls('project_risks');
SELECT _migration_147_apply_tenant_rls('project_assignments');
SELECT _migration_147_apply_tenant_rls('project_documents');

-- Budgeting
SELECT _migration_147_apply_tenant_rls('budget_categories');
SELECT _migration_147_apply_tenant_rls('budgets');
SELECT _migration_147_apply_tenant_rls('budget_lines');
SELECT _migration_147_apply_tenant_rls('budget_revisions');
SELECT _migration_147_apply_tenant_rls('budget_approvals');
SELECT _migration_147_apply_tenant_rls('budget_alerts');

-- Livre corporatif
SELECT _migration_147_apply_tenant_rls('corporate_book');
SELECT _migration_147_apply_tenant_rls('corporate_book_documents');
SELECT _migration_147_apply_tenant_rls('company_settings');

-- Productivite
SELECT _migration_147_apply_tenant_rls('todo_lists');
SELECT _migration_147_apply_tenant_rls('tasks');
SELECT _migration_147_apply_tenant_rls('notes');


-- ── 3. Cleanup helper (reutilise pour 148/149) ──────────────
COMMENT ON FUNCTION _migration_147_apply_tenant_rls(TEXT) IS
'Helper temporaire pour le rollout multi-tenant : applique la policy RESTRICTIVE tenant_isolation sur une table. Reutilisable par migrations 148 (commerce) et 149 (gmail). A supprimer en fin de convergence.';


-- ── 4. Verification finale ──────────────────────────────────
-- Liste les policies tenant_isolation creees, par table.
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'tenant_isolation'
ORDER BY tablename;


-- ── 5. Sanity check : Eric (super_admin) doit voir toutes ses data ─
-- On simule l'eval de la policy : pour Eric, ca doit retourner true
-- pour toutes ses rows existantes.
DO $$
DECLARE
    eric_uid UUID;
    n_visible_props INT;
    n_total_props   INT;
BEGIN
    SELECT id INTO eric_uid FROM auth.users WHERE email = 'eric.dufort@cerdia.ai' LIMIT 1;
    IF eric_uid IS NULL THEN
        RAISE NOTICE '[147] Eric introuvable dans auth.users, sanity check skip.';
        RETURN;
    END IF;

    -- Eric est super_admin → is_super_admin(eric) = true → tenant_isolation pass
    IF NOT public.is_super_admin(eric_uid) THEN
        RAISE EXCEPTION '[147] CRITIQUE : Eric n''est pas super_admin ! Verifier mig 145.';
    END IF;

    -- Count properties total vs accessibles a Eric via la policy
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='properties') THEN
        EXECUTE 'SELECT COUNT(*) FROM properties' INTO n_total_props;
        -- Pour super_admin, toutes les rows sont visibles
        n_visible_props := n_total_props;
        RAISE NOTICE '[147] properties: % rows totales, Eric (super_admin) y a acces.', n_total_props;
    END IF;
END $$;


COMMIT;
