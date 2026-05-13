-- ============================================================
-- Migration 150 : FIX URGENT — ajoute PERMISSIVE pour authenticated
--
-- Contexte du bug :
--   Les migrations 147/148/149 ont :
--     1. Active RLS sur toutes les tables (ALTER TABLE ENABLE ROW LEVEL SECURITY)
--     2. Ajoute une policy RESTRICTIVE tenant_isolation
--
--   Or les migrations 129/130 avaient DESACTIVE la RLS sur commerce_products
--   et commerce_transactions (catalogue public anon). Ces tables n'avaient
--   donc PAS de policy PERMISSIVE pour les users authentifies.
--
--   En Postgres, RLS active + uniquement RESTRICTIVE = DENY ALL pour les
--   authenticated. Resultat : Eric ne voit plus rien dans commerce_*.
--
--   Le meme probleme peut toucher d'autres tables Investissement si elles
--   n'avaient pas non plus de PERMISSIVE pour authenticated.
--
-- Fix :
--   Pour TOUTES les tables qui ont la policy tenant_isolation, on ajoute
--   une policy PERMISSIVE FOR ALL TO authenticated USING (true).
--   La policy RESTRICTIVE tenant_isolation continue de filtrer par tenant.
--
--   Effet :
--     - Authenticated dans le bon tenant : PERMISSIVE passe + RESTRICTIVE passe = OK
--     - Authenticated dans un autre tenant : PERMISSIVE passe + RESTRICTIVE BLOQUE = OK
--     - super_admin : les deux passent (RESTRICTIVE a une clause OR is_super_admin)
--     - anon : pas affecte (policy applique TO authenticated)
--     - service_role : bypass RLS
-- ============================================================

BEGIN;


-- ── 1. Helper : applique la PERMISSIVE manquante ────────────
CREATE OR REPLACE FUNCTION _migration_150_add_permissive(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_table
    ) THEN
        RAISE NOTICE '[150] Table % introuvable, skip.', p_table;
        RETURN;
    END IF;

    -- Idempotence : drop si existe
    EXECUTE format('DROP POLICY IF EXISTS tenant_authenticated_access ON %I', p_table);

    -- PERMISSIVE FOR ALL TO authenticated — le filtrage tenant est fait par
    -- la policy RESTRICTIVE tenant_isolation (ajoutee en 147/148/149).
    EXECUTE format(
        'CREATE POLICY tenant_authenticated_access ON %I '
        'AS PERMISSIVE FOR ALL TO authenticated '
        'USING (true) '
        'WITH CHECK (true)',
        p_table
    );

    RAISE NOTICE '[150] %.tenant_authenticated_access : applique.', p_table;
END $$;


-- ── 2. Application sur TOUTES les tables qui ont tenant_isolation ─
-- Cette boucle dynamique trouve automatiquement toutes les tables qui
-- ont besoin du fix (= celles qui ont tenant_isolation policy).
DO $$
DECLARE
    rec RECORD;
    cnt INT := 0;
BEGIN
    FOR rec IN
        SELECT DISTINCT tablename
          FROM pg_policies
         WHERE schemaname = 'public'
           AND policyname = 'tenant_isolation'
         ORDER BY tablename
    LOOP
        PERFORM _migration_150_add_permissive(rec.tablename);
        cnt := cnt + 1;
    END LOOP;
    RAISE NOTICE '[150] % tables fixees.', cnt;
END $$;


-- ── 3. Cleanup helper ────────────────────────────────────────
DROP FUNCTION IF EXISTS _migration_150_add_permissive(TEXT);


-- ── 4. Verification ─────────────────────────────────────────
-- Liste les tables qui ont MAINTENANT les 2 policies cote a cote :
--   - tenant_isolation (RESTRICTIVE, filtre par tenant)
--   - tenant_authenticated_access (PERMISSIVE, satisfait le requirement RLS)
SELECT
    tablename,
    BOOL_OR(policyname = 'tenant_isolation')              AS has_restrictive,
    BOOL_OR(policyname = 'tenant_authenticated_access')   AS has_permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('tenant_isolation','tenant_authenticated_access')
GROUP BY tablename
HAVING NOT (BOOL_OR(policyname = 'tenant_isolation') AND BOOL_OR(policyname = 'tenant_authenticated_access'))
ORDER BY tablename;
-- ↑ Si ce SELECT retourne 0 lignes → toutes les tables ont les 2 policies, OK.

-- Tableau recap : combien de tables corrigees
SELECT
    'tables_tenant_isolation'        AS metric,
    COUNT(DISTINCT tablename)::TEXT  AS value
FROM pg_policies
WHERE schemaname = 'public' AND policyname = 'tenant_isolation'
UNION ALL
SELECT
    'tables_tenant_authenticated_access',
    COUNT(DISTINCT tablename)::TEXT
FROM pg_policies
WHERE schemaname = 'public' AND policyname = 'tenant_authenticated_access';
-- Les deux counts doivent etre EGAUX.


-- ── 5. Sanity check : counts des tables critiques visibles a Eric ─
DO $$
DECLARE
    eric_uid UUID;
    n_props  INT;
    n_tx     INT;
    n_prod   INT;
BEGIN
    SELECT id INTO eric_uid FROM auth.users WHERE email = 'eric.dufort@cerdia.ai' LIMIT 1;
    IF eric_uid IS NULL THEN RETURN; END IF;

    -- En tant que super_admin Eric voit tout via la RESTRICTIVE.
    -- Ces SELECTs sont executes en SECURITY DEFINER (anonymous DO block as superuser),
    -- donc ils bypassent RLS et donnent le vrai compte.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='properties') THEN
        EXECUTE 'SELECT COUNT(*) FROM properties' INTO n_props;
        RAISE NOTICE '[150] properties total = %', n_props;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='commerce_transactions') THEN
        EXECUTE 'SELECT COUNT(*) FROM commerce_transactions' INTO n_tx;
        RAISE NOTICE '[150] commerce_transactions total = %', n_tx;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='commerce_products') THEN
        EXECUTE 'SELECT COUNT(*) FROM commerce_products' INTO n_prod;
        RAISE NOTICE '[150] commerce_products total = %', n_prod;
    END IF;
END $$;


COMMIT;
