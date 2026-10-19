-- =====================================================================
-- Migration 223 : Fermer l'accès ANONYME aux données réelles (faille RLS)
-- =====================================================================
-- CONSTAT (2026-10-17, signalé par un tiers + vérifié avec la clé anon) :
--   Sans compte, la clé publique anon lisait les données réelles CERDIA :
--   transactions, gmail_invoices, investors (courriels, téléphones, parts),
--   payment_schedules, documents, users, csecur360_clients/vendors, etc.
--
-- CAUSE :
--   La policy RESTRICTIVE `tenant_isolation` (mig.147) est `TO authenticated`
--   seulement. Pour le rôle anon, rien ne filtre : les anciennes policies
--   PERMISSIVE `USING (true)` créées sans clause TO (rôle public = anon inclus)
--   laissent tout passer, en lecture ET potentiellement en écriture.
--
-- CORRECTIF :
--   1. Sur CHAQUE table ayant organization_id : policy RESTRICTIVE
--      `anon_demo_only` FOR ALL TO anon → anon ne voit QUE le tenant démo
--      (is_demo = true) et ne peut RIEN écrire (WITH CHECK false).
--      Les utilisateurs connectés ne sont pas touchés (policy TO anon).
--      Exceptions gérées à part :
--        - portfolio_profiles : déjà traité en mig.210 (page publique + lien fill)
--        - commerce_products  : boutique publique → anon lit les produits actifs
--   2. Tables sans organization_id contenant des données privées
--      (users, csecur360_*) : REVOKE total pour anon.
--   3. Tables publiques sans organization_id (home_slides, exchange_rates_annual) :
--      lecture anon conservée, écriture anon révoquée.
--
-- NON TOUCHÉ (volontaire) : portfolio_items (lien de remplissage anonyme),
--   organizations (anon ne voit que le tenant démo via mig.158).
--
-- Idempotent : peut être ré-exécutée sans effet de bord.
-- =====================================================================

BEGIN;

-- ── 1. RESTRICTIVE anon_demo_only sur toutes les tables tenant-scoped ────
DO $$
DECLARE
    rec       RECORD;
    applied   INT := 0;
BEGIN
    FOR rec IN
        SELECT c.table_name
          FROM information_schema.columns c
          JOIN information_schema.tables t
            ON t.table_schema = c.table_schema AND t.table_name = c.table_name
         WHERE c.table_schema = 'public'
           AND c.column_name  = 'organization_id'
           AND t.table_type   = 'BASE TABLE'
           AND c.table_name NOT IN ('portfolio_profiles', 'commerce_products', 'organizations')
         ORDER BY c.table_name
    LOOP
        -- RLS désactivée = la policy ne servirait à rien : on l'active.
        -- Si aucune policy PERMISSIVE n'existe pour authenticated, on en crée
        -- une filtrée par tenant pour ne pas couper l'app aux utilisateurs connectés.
        IF NOT (SELECT relrowsecurity FROM pg_class
                 WHERE oid = format('public.%I', rec.table_name)::regclass) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.table_name);
            RAISE NOTICE '[223] %.RLS : était DÉSACTIVÉE → activée.', rec.table_name;

            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                 WHERE schemaname = 'public'
                   AND tablename  = rec.table_name
                   AND permissive = 'PERMISSIVE'
                   AND (roles && ARRAY['authenticated','public']::name[])
            ) THEN
                EXECUTE format(
                    'CREATE POLICY auth_tenant_access ON public.%I '
                    'AS PERMISSIVE FOR ALL TO authenticated '
                    'USING (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid())) '
                    'WITH CHECK (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid()))',
                    rec.table_name
                );
                RAISE NOTICE '[223] %.auth_tenant_access : créée (aucune permissive existante).', rec.table_name;
            END IF;
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS anon_demo_only ON public.%I', rec.table_name);
        EXECUTE format(
            'CREATE POLICY anon_demo_only ON public.%I '
            'AS RESTRICTIVE FOR ALL TO anon '
            'USING (organization_id IN (SELECT id FROM public.organizations '
            '                            WHERE is_demo = true AND status = ''active'')) '
            'WITH CHECK (false)',
            rec.table_name
        );
        applied := applied + 1;
    END LOOP;

    RAISE NOTICE '[223] anon_demo_only appliquée sur % tables.', applied;
END $$;


-- ── 2. commerce_products : boutique publique, produits actifs seulement ──
DROP POLICY IF EXISTS anon_active_products_only ON public.commerce_products;
CREATE POLICY anon_active_products_only ON public.commerce_products
    AS RESTRICTIVE FOR ALL TO anon
    USING (active = true)
    WITH CHECK (false);


-- ── 3. Tables privées sans organization_id : aucun accès anon ────────────
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users', 'csecur360_clients', 'csecur360_vendors', 'csecur360_modules'] LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
            RAISE NOTICE '[223] %.anon : accès révoqué.', t;
        END IF;
    END LOOP;
END $$;


-- ── 4. Tables publiques sans organization_id : lecture seule pour anon ───
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['home_slides', 'exchange_rates_annual'] LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon', t);
            RAISE NOTICE '[223] %.anon : écriture révoquée (lecture conservée).', t;
        END IF;
    END LOOP;
END $$;


-- ── 5. Journal ──────────────────────────────────────────────────────────
INSERT INTO schema_migrations (version) VALUES ('223') ON CONFLICT (version) DO NOTHING;

COMMIT;


-- ── Vérification (doit retourner 0 ligne) ───────────────────────────────
-- Tables avec organization_id SANS la protection anon (hors exceptions voulues).
SELECT c.table_name AS table_non_protegee
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
 WHERE c.table_schema = 'public'
   AND c.column_name  = 'organization_id'
   AND t.table_type   = 'BASE TABLE'
   AND c.table_name NOT IN ('portfolio_profiles', 'commerce_products', 'organizations')
   AND NOT EXISTS (
       SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename  = c.table_name
          AND p.policyname = 'anon_demo_only'
   )
 ORDER BY 1;
