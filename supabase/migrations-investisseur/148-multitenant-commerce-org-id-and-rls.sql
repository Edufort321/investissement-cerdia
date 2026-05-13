-- ============================================================
-- Migration 148 : Multi-Tenant — Commerce + Invoicing
--
-- Ajoute organization_id (+ FK + index + backfill CERDIA) ET la policy
-- RESTRICTIVE tenant_isolation sur les 6 tables des modules Commerce
-- et Invoicing interne.
--
-- Reutilise les helpers _migration_146_add_org_id et
-- _migration_147_apply_tenant_rls definis dans les migrations precedentes.
--
-- ⚠ NON-DESTRUCTIF : pareil que 146/147.
-- ⚠ Suppose que mig 145, 146, 147 ont ete appliquees.
-- ============================================================

BEGIN;

-- ── 1. Verification prerequis ────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = '_migration_146_add_org_id'
    ) THEN
        RAISE EXCEPTION '[148] Helper _migration_146_add_org_id absent. Appliquer mig 146 d''abord.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = '_migration_147_apply_tenant_rls'
    ) THEN
        RAISE EXCEPTION '[148] Helper _migration_147_apply_tenant_rls absent. Appliquer mig 147 d''abord.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM organizations
         WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid
    ) THEN
        RAISE EXCEPTION '[148] Organisation CERDIA Globale introuvable. Appliquer mig 145 d''abord.';
    END IF;
END $$;


-- ── 2. Commerce : produits, transactions, plateformes ───────
SELECT _migration_146_add_org_id('commerce_products');
SELECT _migration_146_add_org_id('commerce_transactions');
SELECT _migration_146_add_org_id('commerce_platforms');

SELECT _migration_147_apply_tenant_rls('commerce_products');
SELECT _migration_147_apply_tenant_rls('commerce_transactions');
SELECT _migration_147_apply_tenant_rls('commerce_platforms');


-- ── 3. Invoicing : facturation interne CERDIA ───────────────
-- (sera utilisee aussi par les autres tenants pour leur propre facturation)
SELECT _migration_146_add_org_id('invoice_clients');
SELECT _migration_146_add_org_id('invoices');
SELECT _migration_146_add_org_id('invoice_items');

SELECT _migration_147_apply_tenant_rls('invoice_clients');
SELECT _migration_147_apply_tenant_rls('invoices');
SELECT _migration_147_apply_tenant_rls('invoice_items');


-- ── 4. Verification finale ──────────────────────────────────
-- Confirme que les 6 tables ont org_id + FK + index + policy tenant_isolation
SELECT
    t.table_name,
    (SELECT COUNT(*) FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t.table_name AND column_name='organization_id') AS has_org_id,
    (SELECT COUNT(*) FROM pg_constraint
      WHERE conname=format('fk_%s_organization', t.table_name))                                  AS has_fk,
    (SELECT COUNT(*) FROM pg_indexes
      WHERE schemaname='public' AND indexname=format('idx_%s_organization', t.table_name))       AS has_index,
    (SELECT COUNT(*) FROM pg_policies
      WHERE schemaname='public' AND tablename=t.table_name AND policyname='tenant_isolation')    AS has_rls
FROM (VALUES
    ('commerce_products'), ('commerce_transactions'), ('commerce_platforms'),
    ('invoice_clients'), ('invoices'), ('invoice_items')
) AS t(table_name)
ORDER BY t.table_name;


-- ── 5. Sanity check : aucune ligne sans org_id ─────────────
DO $$
DECLARE
    bad INT;
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['commerce_products','commerce_transactions','commerce_platforms','invoice_clients','invoices','invoice_items'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id IS NULL', t) INTO bad;
            IF bad > 0 THEN
                RAISE EXCEPTION '[148] % : % rows sans organization_id', t, bad;
            END IF;
        END IF;
    END LOOP;
END $$;


COMMIT;
