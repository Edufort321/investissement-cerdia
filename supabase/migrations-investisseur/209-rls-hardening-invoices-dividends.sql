-- Migration 209 : Durcissement RLS — factures + dividendes (anti-contamination)
-- =====================================================================
-- Corrige 2 failles multi-tenant confirmées :
--
-- FAILLE A — invoices / invoice_clients / invoice_items :
--   RLS activée en mig.125, puis DÉSACTIVÉE en mig.132 ("protégé côté app"),
--   jamais réactivée. La mig.148 a bien ajouté organization_id + une policy
--   tenant_isolation, MAIS comme RLS est OFF, la policy ne s'applique pas.
--   → Tout utilisateur authentifié peut lire/écrire les factures de TOUS les tenants.
--   CORRECTIF : réactiver RLS (la policy tenant_isolation de la 148 reprend effet)
--   + policy PERMISSIVE authenticated (sinon RLS active sans permissive = deny all).
--
-- FAILLE B — dividend_declarations / dividend_investor_elections :
--   RLS active mais les policies filtrent par action_class IN ('admin','B','C'),
--   SANS filtre organization_id (mig.202). Un admin d'un tenant voit/modifie les
--   dividendes des AUTRES tenants.
--   CORRECTIF : ajouter une policy RESTRICTIVE tenant_isolation (filtre org).
--
-- Idempotent. Non destructif sur les données.
-- =====================================================================

-- ── FAILLE A : réactiver RLS sur les tables de facturation ───────────────
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['invoices','invoice_clients','invoice_items'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=v_table) THEN

      -- Réactive RLS (la policy tenant_isolation de la mig.148 reprend effet)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

      -- Policy PERMISSIVE de base (requise : RLS active sans permissive = deny all).
      -- Le filtrage tenant réel est assuré par la RESTRICTIVE tenant_isolation (mig.148).
      EXECUTE format('DROP POLICY IF EXISTS authenticated_access ON public.%I', v_table);
      EXECUTE format(
        'CREATE POLICY authenticated_access ON public.%I '
        'AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        v_table
      );

      -- Garantit la RESTRICTIVE tenant_isolation (recrée au cas où absente).
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', v_table);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
        'USING (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid())) '
        'WITH CHECK (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid()))',
        v_table
      );
      RAISE NOTICE '[209] RLS reactivee + tenant_isolation sur %', v_table;
    END IF;
  END LOOP;
END $$;

-- ── FAILLE B : ajouter le filtre tenant aux dividendes + fiscal + rapports ──
-- Mêmes symptômes : RLS active mais policy SANS filtre organization_id.
--   - dividend_declarations / dividend_investor_elections : filtre action_class (mig.202)
--   - fiscal_year_settings : policy USING(true) (mig.196)
--   - investor_report_requests : policy is_cerdia_admin sans org (mig.203)
DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['dividend_declarations','dividend_investor_elections',
                                 'fiscal_year_settings','investor_report_requests'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=v_table AND column_name='organization_id') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', v_table);
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
        'USING (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid())) '
        'WITH CHECK (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid()))',
        v_table
      );
      RAISE NOTICE '[209] tenant_isolation ajoute sur %', v_table;
    ELSE
      RAISE NOTICE '[209] %.organization_id absent — skip (verifier mig 146/202)', v_table;
    END IF;
  END LOOP;
END $$;

-- ── Vérification : RLS active sur les 5 tables ───────────────────────────
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_active,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = c.relname
     AND p.policyname = 'tenant_isolation') AS has_tenant_isolation
FROM pg_class c
WHERE c.relname IN ('invoices','invoice_clients','invoice_items',
                    'dividend_declarations','dividend_investor_elections',
                    'fiscal_year_settings','investor_report_requests')
ORDER BY c.relname;
