-- ============================================================
-- Migration 146 : Multi-Tenant — ajout organization_id sur les tables Investissement
--
-- Ajoute la colonne `organization_id UUID NOT NULL DEFAULT '<CERDIA>'`
-- + FK + index sur toutes les tables du module Investissement immobilier
-- (~56 tables). Backfill toutes les rows existantes avec l'UUID de CERDIA Globale.
--
-- ⚠ NON-DESTRUCTIF : aucune table n'est purgee, aucune ligne supprimee.
-- ⚠ NE TOUCHE PAS LES RLS : sera fait en Migration 147 (separation des risques).
-- ⚠ DEFAULT CERDIA UUID : tes INSERTs actuels continuent sans modif de l'app
--    (les nouvelles rows defaultent sur CERDIA Globale, ce qui est correct tant
--    qu'il n'y a pas d'autres tenants reels). Le default sera retire en Phase 2.
-- ⚠ Helper avec skip-if-missing : si une table n'existe pas (deprecated),
--    la migration continue avec un NOTICE au lieu de planter.
-- ============================================================

BEGIN;


-- ── 1. Helper function : applique le pattern sur 1 table ────
CREATE OR REPLACE FUNCTION _migration_146_add_org_id(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    cerdia_uuid CONSTANT UUID := 'c0000000-0000-0000-0000-000000000001';
    fk_name     TEXT;
    idx_name    TEXT;
BEGIN
    -- Skip if table doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_table
    ) THEN
        RAISE NOTICE '[146] Table % introuvable, skip.', p_table;
        RETURN;
    END IF;

    -- 1.1 ADD COLUMN si absente (avec DEFAULT CERDIA UUID pour ne pas casser les INSERT existants)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'organization_id'
    ) THEN
        EXECUTE format(
            'ALTER TABLE %I ADD COLUMN organization_id UUID NOT NULL DEFAULT %L::uuid',
            p_table, cerdia_uuid
        );
        RAISE NOTICE '[146] %.organization_id : ajoute (default CERDIA).', p_table;
    ELSE
        -- Colonne existe deja : verifier NOT NULL + backfill
        EXECUTE format(
            'UPDATE %I SET organization_id = %L::uuid WHERE organization_id IS NULL',
            p_table, cerdia_uuid
        );
        EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET NOT NULL', p_table);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET DEFAULT %L::uuid', p_table, cerdia_uuid);
        RAISE NOTICE '[146] %.organization_id : deja presente, backfill + NOT NULL.', p_table;
    END IF;

    -- 1.2 FK vers organizations(id) si absente
    fk_name := format('fk_%s_organization', p_table);
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = fk_name
    ) THEN
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT',
            p_table, fk_name
        );
    END IF;

    -- 1.3 Index sur organization_id (acceleration des futures RLS et requetes par tenant)
    idx_name := format('idx_%s_organization', p_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (organization_id)', idx_name, p_table);
END $$;


-- ── 2. Application sur toutes les tables du module Investissement ─

-- Core entites (investisseurs, proprietes, transactions, etats financiers)
SELECT _migration_146_add_org_id('investors');
SELECT _migration_146_add_org_id('properties');
SELECT _migration_146_add_org_id('transactions');
SELECT _migration_146_add_org_id('documents');
SELECT _migration_146_add_org_id('dividends');
SELECT _migration_146_add_org_id('dividend_allocations');
SELECT _migration_146_add_org_id('capex_accounts');
SELECT _migration_146_add_org_id('current_accounts');
SELECT _migration_146_add_org_id('rnd_accounts');
SELECT _migration_146_add_org_id('operational_expenses');
SELECT _migration_146_add_org_id('reports');

-- Investisseurs (relations)
SELECT _migration_146_add_org_id('investor_investments');
SELECT _migration_146_add_org_id('investor_debts');
SELECT _migration_146_add_org_id('investor_reservations');
SELECT _migration_146_add_org_id('investor_properties');

-- Proprietes (attachments, links, valuations, API)
SELECT _migration_146_add_org_id('property_attachments');
SELECT _migration_146_add_org_id('property_links');
SELECT _migration_146_add_org_id('property_valuations');
SELECT _migration_146_add_org_id('property_management_api');

-- Tracking financier (NAV, parts, dettes, paiements)
SELECT _migration_146_add_org_id('nav_history');
SELECT _migration_146_add_org_id('share_price_history');
SELECT _migration_146_add_org_id('share_links');
SELECT _migration_146_add_org_id('liabilities');
SELECT _migration_146_add_org_id('payment_schedules');
SELECT _migration_146_add_org_id('transaction_attachments');
SELECT _migration_146_add_org_id('audit_log');
SELECT _migration_146_add_org_id('monthly_verifications');

-- Scenarios (planification d'investissements)
SELECT _migration_146_add_org_id('scenarios');
SELECT _migration_146_add_org_id('scenario_results');
SELECT _migration_146_add_org_id('scenario_votes');
SELECT _migration_146_add_org_id('scenario_documents');
SELECT _migration_146_add_org_id('scenario_actual_values');
SELECT _migration_146_add_org_id('scenario_bookings');

-- Tresorerie
SELECT _migration_146_add_org_id('bank_accounts');
SELECT _migration_146_add_org_id('bank_transactions');
SELECT _migration_146_add_org_id('cash_flow_forecast');
SELECT _migration_146_add_org_id('payment_obligations');
SELECT _migration_146_add_org_id('treasury_alerts');

-- Gestion de projets immobiliers
SELECT _migration_146_add_org_id('contractors');
SELECT _migration_146_add_org_id('project_phases');
SELECT _migration_146_add_org_id('project_milestones');
SELECT _migration_146_add_org_id('project_risks');
SELECT _migration_146_add_org_id('project_assignments');
SELECT _migration_146_add_org_id('project_documents');

-- Budgeting
SELECT _migration_146_add_org_id('budget_categories');
SELECT _migration_146_add_org_id('budgets');
SELECT _migration_146_add_org_id('budget_lines');
SELECT _migration_146_add_org_id('budget_revisions');
SELECT _migration_146_add_org_id('budget_approvals');
SELECT _migration_146_add_org_id('budget_alerts');

-- Livre corporatif
SELECT _migration_146_add_org_id('corporate_book');
SELECT _migration_146_add_org_id('corporate_book_documents');
SELECT _migration_146_add_org_id('company_settings');

-- Productivite (notes, todos)
SELECT _migration_146_add_org_id('todo_lists');
SELECT _migration_146_add_org_id('tasks');
SELECT _migration_146_add_org_id('notes');


-- ── 3. Cleanup : on garde le helper pour la 147+ (utile pour autres modules) ─
-- On NE drop PAS _migration_146_add_org_id : reutilise par mig 148 (commerce)
-- et 149 (gmail). Sera supprime apres convergence du multi-tenant.

COMMENT ON FUNCTION _migration_146_add_org_id(TEXT) IS
'Helper temporaire pour le rollout multi-tenant : ADD COLUMN organization_id + backfill + NOT NULL + FK + index. Reutilise par migrations 148/149 (commerce, gmail). A supprimer une fois toutes les tables migrees.';


-- ── 4. Verification finale ──────────────────────────────────
-- Liste les tables du module Investissement et confirme la colonne presente
-- avec une row count par organization_id (doit toutes pointer vers CERDIA).
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t.table_name
        AND column_name = 'organization_id')                  AS has_org_id,
    (SELECT COUNT(*) FROM pg_constraint
      WHERE conname = format('fk_%s_organization', t.table_name)) AS has_fk,
    (SELECT COUNT(*) FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname  = format('idx_%s_organization', t.table_name)) AS has_index
FROM (VALUES
    ('properties'), ('transactions'), ('investor_investments'),
    ('payment_schedules'), ('property_valuations'), ('nav_history'),
    ('liabilities'), ('audit_log'), ('budgets'), ('bank_accounts'),
    ('treasury_alerts'), ('scenarios'), ('contractors'), ('todo_lists')
) AS t(table_name)
ORDER BY table_name;


-- ── 5. Sanity check : aucune ligne sans org_id dans les tables critiques ─
DO $$
DECLARE
    bad_rows INT;
BEGIN
    -- properties
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='properties') THEN
        EXECUTE 'SELECT COUNT(*) FROM properties WHERE organization_id IS NULL' INTO bad_rows;
        IF bad_rows > 0 THEN RAISE EXCEPTION 'properties : % rows sans organization_id', bad_rows; END IF;
    END IF;
    -- transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transactions') THEN
        EXECUTE 'SELECT COUNT(*) FROM transactions WHERE organization_id IS NULL' INTO bad_rows;
        IF bad_rows > 0 THEN RAISE EXCEPTION 'transactions : % rows sans organization_id', bad_rows; END IF;
    END IF;
    -- investor_investments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='investor_investments') THEN
        EXECUTE 'SELECT COUNT(*) FROM investor_investments WHERE organization_id IS NULL' INTO bad_rows;
        IF bad_rows > 0 THEN RAISE EXCEPTION 'investor_investments : % rows sans organization_id', bad_rows; END IF;
    END IF;
END $$;


COMMIT;
