-- ============================================================
-- Migration 153 : Multi-Tenant — RPC functions SECURITY INVOKER
--
-- Bug : les RPC SQL get_nav_timeline(), get_financial_summary(),
-- calculate_realistic_nav_v2(), etc. sont SECURITY DEFINER → elles
-- tournent avec les privileges du OWNER (postgres superuser) qui
-- BYPASS RLS → les nouveaux tenants voient les NAV / soldes de
-- CERDIA Globale.
--
-- Fix : ALTER FUNCTION ... SECURITY INVOKER. La fonction tourne
-- maintenant avec les privileges du caller, donc les SELECTs internes
-- respectent les policies tenant_isolation. Pour un user dans le
-- tenant X, la function ne voit que les rows de X.
--
-- On NE TOUCHE PAS :
--   - auth_get_org_id, is_super_admin, is_org_admin, is_cerdia_admin
--     → restent SECURITY DEFINER (bypass RLS pour leur propre lookup
--     du role/org du caller)
--   - handle_new_user → trigger INSERT profiles, doit etre DEFINER
--   - Les triggers de touch_updated_at → idem
-- ============================================================

BEGIN;

DO $$
DECLARE
    rec       RECORD;
    converted INT := 0;
    skipped   INT := 0;
BEGIN
    FOR rec IN
        SELECT
            n.nspname,
            p.proname,
            pg_get_function_identity_arguments(p.oid) AS args
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.prosecdef = TRUE
           AND p.proname NOT IN (
               -- Helpers auth : doivent rester SECURITY DEFINER
               'auth_get_org_id',
               'is_super_admin',
               'is_org_admin',
               'is_cerdia_admin',
               'handle_new_user',
               -- Triggers updated_at : pas concerne par RLS leak (juste set un timestamp)
               'update_updated_at',
               'touch_profiles_updated_at',
               'touch_organizations_updated_at',
               'update_company_settings_updated_at'
           )
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION %I.%I(%s) SECURITY INVOKER',
                rec.nspname, rec.proname, rec.args
            );
            converted := converted + 1;
            RAISE NOTICE '[153] %.%(%) → SECURITY INVOKER', rec.nspname, rec.proname, rec.args;
        EXCEPTION WHEN OTHERS THEN
            skipped := skipped + 1;
            RAISE NOTICE '[153] SKIP %.%(%) : %', rec.nspname, rec.proname, rec.args, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '[153] === % fonctions converties, % skip ===', converted, skipped;
END $$;


-- ── Verification : compte des fonctions encore SECURITY DEFINER ────
-- (ne doit lister que les helpers auth + triggers)
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS args,
    CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = TRUE
ORDER BY p.proname;


COMMIT;
