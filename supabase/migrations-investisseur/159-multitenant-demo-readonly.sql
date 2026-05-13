-- ============================================================
-- Migration 159 : Multi-Tenant — Démo en read-only
--
-- Bloque INSERT/UPDATE/DELETE sur toutes les tables tenant-scoped
-- pour les users dont l'organization courante est un tenant DEMO
-- (is_demo=true). Le SELECT reste autorisé (visiteurs anon via
-- demo_public_read, et users authentifiés via tenant_authenticated_access).
--
-- Exception : super_admin peut tout faire via is_super_admin() bypass.
--
-- Eric edite les donnees du demo via :
--   - Supabase Studio (service_role bypasse RLS automatiquement)
--   - Ou un script `scripts/seed-demo-data.ts` avec service_role
-- ============================================================

BEGIN;

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
        -- Drop previous versions if any (idempotence)
        EXECUTE format('DROP POLICY IF EXISTS demo_block_inserts ON %I', rec.tablename);
        EXECUTE format('DROP POLICY IF EXISTS demo_block_updates ON %I', rec.tablename);
        EXECUTE format('DROP POLICY IF EXISTS demo_block_deletes ON %I', rec.tablename);

        -- INSERT : bloque sauf super_admin OR org du caller != demo
        EXECUTE format(
            'CREATE POLICY demo_block_inserts ON %I '
            'AS RESTRICTIVE FOR INSERT TO authenticated '
            'WITH CHECK ('
            '    public.is_super_admin(auth.uid()) '
            '    OR public.auth_get_org_id() NOT IN (SELECT id FROM organizations WHERE is_demo = true)'
            ')',
            rec.tablename
        );

        -- UPDATE : bloque sauf super_admin OR org du caller != demo
        EXECUTE format(
            'CREATE POLICY demo_block_updates ON %I '
            'AS RESTRICTIVE FOR UPDATE TO authenticated '
            'USING ('
            '    public.is_super_admin(auth.uid()) '
            '    OR public.auth_get_org_id() NOT IN (SELECT id FROM organizations WHERE is_demo = true)'
            ') '
            'WITH CHECK ('
            '    public.is_super_admin(auth.uid()) '
            '    OR public.auth_get_org_id() NOT IN (SELECT id FROM organizations WHERE is_demo = true)'
            ')',
            rec.tablename
        );

        -- DELETE : bloque sauf super_admin OR org du caller != demo
        EXECUTE format(
            'CREATE POLICY demo_block_deletes ON %I '
            'AS RESTRICTIVE FOR DELETE TO authenticated '
            'USING ('
            '    public.is_super_admin(auth.uid()) '
            '    OR public.auth_get_org_id() NOT IN (SELECT id FROM organizations WHERE is_demo = true)'
            ')',
            rec.tablename
        );

        converted := converted + 1;
        RAISE NOTICE '[159] %.demo_block_{inserts,updates,deletes} : appliquees', rec.tablename;
    END LOOP;

    RAISE NOTICE '[159] === % tables protegees en read-only pour les users du demo ===', converted;
END $$;


-- ── Verification ────────────────────────────────────────────
SELECT
    COUNT(DISTINCT tablename) AS tables_with_demo_block
  FROM pg_policies
 WHERE schemaname = 'public'
   AND policyname LIKE 'demo_block_%';


COMMIT;
