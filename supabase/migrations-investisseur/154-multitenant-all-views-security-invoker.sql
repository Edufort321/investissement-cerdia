-- ============================================================
-- Migration 154 : Multi-Tenant — toutes les VIEWS en security_invoker
--
-- Suite a mig 152 (qui a fix share_settings + investor_summary) et
-- mig 153 (qui a fix les RPC SECURITY DEFINER), il restait encore
-- des VIEWS qui leaked :
--   - property_performance (mig 13)     → fuite Performance ROI
--   - corporate_book_view (mig 60)      → fuite Livre d'entreprise
--   - scenarios_with_votes              → fuite Évaluateur
--   - v_factures / v_recus / v_unassigned / v_monthly_totals  (gmail)
--   - et possiblement d'autres
--
-- Cause : par defaut, les views Postgres tournent avec privileges
-- du OWNER (postgres superuser) → BYPASS RLS. Fix : security_invoker
-- = true sur la view → respecte la RLS du caller.
--
-- Cette migration introspecte pg_class et ajoute security_invoker
-- sur TOUTES les views du schema public qui ne l'ont pas deja.
-- ============================================================

BEGIN;

DO $$
DECLARE
    rec       RECORD;
    converted INT := 0;
    skipped   INT := 0;
BEGIN
    FOR rec IN
        SELECT n.nspname, c.relname, c.oid, c.reloptions
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind = 'v'           -- views uniquement (pas materialized)
           AND n.nspname = 'public'
         ORDER BY c.relname
    LOOP
        -- Verifier si security_invoker=true est deja set
        IF rec.reloptions @> ARRAY['security_invoker=true'] THEN
            RAISE NOTICE '[154] %.% deja security_invoker=true, skip.', rec.nspname, rec.relname;
            skipped := skipped + 1;
            CONTINUE;
        END IF;

        BEGIN
            EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)',
                           rec.nspname, rec.relname);
            converted := converted + 1;
            RAISE NOTICE '[154] %.% → security_invoker=true', rec.nspname, rec.relname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[154] SKIP %.% : %', rec.nspname, rec.relname, SQLERRM;
            skipped := skipped + 1;
        END;
    END LOOP;

    RAISE NOTICE '[154] === % views converties, % deja OK/skip ===', converted, skipped;
END $$;


-- ── Verification : liste des views avec leurs options ─────
SELECT
    n.nspname        AS schema,
    c.relname        AS view_name,
    c.reloptions     AS options,
    CASE
        WHEN c.reloptions @> ARRAY['security_invoker=true'] THEN '✅ INVOKER'
        ELSE '⚠️ DEFINER (par defaut)'
    END AS security_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
ORDER BY c.relname;


COMMIT;
