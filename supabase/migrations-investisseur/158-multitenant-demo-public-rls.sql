-- ============================================================
-- Migration 158 : Multi-Tenant — Démo public (Phase 5)
--
-- Permet aux visiteurs anonymes de cerdia.ai/demo de voir le tenant
-- de démonstration en lecture seule.
--
-- Strategie :
--   - Cree un tenant 'DEMO Plateforme' avec is_demo=true, plan='demo'
--   - Ajoute une policy PERMISSIVE TO anon FOR SELECT sur chaque table
--     tenant-scoped : autorise les anon a lire les rows ou
--     organization_id appartient a un tenant avec is_demo=true
--   - Les RESTRICTIVE tenant_isolation existantes ne touchent pas les
--     anon (elles ont FOR ALL TO authenticated)
--   - Donc anon = read-only sur demo seulement
--   - Eric (super_admin) peut editer le demo via "View as..." en mode
--     support
-- ============================================================

BEGIN;

-- ── 1. Tenant DEMO ──────────────────────────────────────────
-- UUID deterministe pour reference facile (proche de celui de CERDIA)
INSERT INTO organizations (id, name, slug, plan, status, settings, is_demo, onboarding_completed)
VALUES (
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO — Plateforme CERDIA',
    'demo',
    'demo',
    'active',
    jsonb_build_object(
        'currency_primary', 'CAD',
        'currencies_enabled', jsonb_build_array('CAD', 'USD'),
        'tax_jurisdiction', 'CA',
        'tax_forms', jsonb_build_array('T1135', 'T2209'),
        'share_classes', jsonb_build_array('A', 'B'),
        'modules', jsonb_build_object(
            'investment', true,
            'commerce', false,
            'gmail', false,
            'amazon', false
        )
    ),
    true,
    true
)
ON CONFLICT (id) DO NOTHING;


-- ── 2. Policy pour organizations elle-meme (anon peut voir le demo) ─
DROP POLICY IF EXISTS demo_org_public_read ON organizations;
CREATE POLICY demo_org_public_read ON organizations
    AS PERMISSIVE
    FOR SELECT
    TO anon
    USING (is_demo = true AND status = 'active');


-- ── 3. Policy demo_public_read sur toutes les tables tenant-scoped ─
DO $$
DECLARE
    rec       RECORD;
    converted INT := 0;
BEGIN
    FOR rec IN
        SELECT DISTINCT tablename
          FROM pg_policies
         WHERE schemaname = 'public'
           AND policyname = 'tenant_isolation'
         ORDER BY tablename
    LOOP
        -- Drop si existe (idempotence)
        EXECUTE format('DROP POLICY IF EXISTS demo_public_read ON %I', rec.tablename);

        -- Cree la policy PERMISSIVE FOR SELECT TO anon, filtree par tenant demo
        EXECUTE format(
            'CREATE POLICY demo_public_read ON %I '
            'AS PERMISSIVE FOR SELECT TO anon '
            'USING (organization_id IN (SELECT id FROM organizations WHERE is_demo = true AND status = ''active''))',
            rec.tablename
        );
        converted := converted + 1;
        RAISE NOTICE '[158] %.demo_public_read : applique', rec.tablename;
    END LOOP;
    RAISE NOTICE '[158] === % tables avec demo_public_read ===', converted;
END $$;


-- ── 4. Verification ─────────────────────────────────────────
-- Confirme que le tenant demo existe
SELECT id, name, slug, plan, status, is_demo FROM organizations WHERE is_demo = true;

-- Count des policies demo_public_read
SELECT
    COUNT(DISTINCT tablename) AS tables_with_demo_policy
  FROM pg_policies
 WHERE schemaname = 'public' AND policyname = 'demo_public_read';


COMMIT;
