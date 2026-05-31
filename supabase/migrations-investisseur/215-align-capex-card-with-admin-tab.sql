-- =====================================================
-- MIGRATION 215: Aligner la carte « Réserve CAPEX » du dashboard
--                sur l'onglet admin CAPEX (v_capex_summary)
-- =====================================================
-- PROBLÈME :
--   La carte « Réserve CAPEX » du tableau de bord (FinancialKPIs ->
--   get_financial_summary) calculait le CAPEX comme :
--       SUM(amount) WHERE type = 'capex'
--   alors que l'onglet Administration > CAPEX (v_capex_summary, mig 95)
--   le calcule à partir des transactions ainsi :
--       reçu    = payment_source = 'capex' AND amount > 0  (transferts vers réserve)
--       dépensé = category       = 'capex' AND amount < 0  (dépenses depuis réserve)
--       solde   = reçu + dépensé
--   Comme le CAPEX réel est enregistré via payment_source / category (et non
--   via type), la carte affichait un solde différent (souvent 0) de l'onglet.
--
-- SOLUTION :
--   Recréer get_financial_summary (base mig 165) en ne changeant QUE la
--   branche « CAPEX Réserve » pour reprendre exactement la formule de
--   v_capex_summary, tout en conservant le filtre tenant (organization_id).
--   Les 4 autres branches (investissement, compte courant, projets,
--   opération) sont identiques à la mig 165.
--
-- Aucune donnée n'est touchée — uniquement la fonction de calcul.
--
-- Dépendances : 165 (version précédente), 145 (auth_get_org_id, is_super_admin),
--   158 (organizations.is_demo), 95 (v_capex_summary)
-- =====================================================

DROP FUNCTION IF EXISTS get_financial_summary(integer);
DROP FUNCTION IF EXISTS get_financial_summary(integer, uuid);
DROP FUNCTION IF EXISTS get_financial_summary();

CREATE OR REPLACE FUNCTION get_financial_summary(
  p_year INTEGER DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
  result_category TEXT,
  result_metric   TEXT,
  result_value    NUMERIC
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_org UUID := COALESCE(p_org_id, auth_get_org_id());
BEGIN
  -- Garde-fou tenant
  IF v_org IS DISTINCT FROM auth_get_org_id() THEN
    IF NOT is_super_admin()
       AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = v_org AND o.is_demo = true) THEN
      RAISE EXCEPTION 'Accès non autorisé aux données de cette organisation';
    END IF;
  END IF;

  RETURN QUERY

  -- Total Investisseurs
  SELECT
    'investissement'::TEXT,
    'Total Investisseurs'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.status != 'cancelled'
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Compte Courant : entrées toujours comptées, sorties respectent affects_compte_courant
  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      COALESCE((
        SELECT SUM(t1.amount) FROM transactions t1
        WHERE t1.type IN ('investissement','loyer','loyer_locatif','revenu','dividende')
          AND t1.status != 'cancelled'
          AND t1.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)
      ), 0)
      -
      COALESCE((
        SELECT SUM(t2.amount) FROM transactions t2
        WHERE t2.type IN (
            'achat_propriete','capex','maintenance','admin',
            'depense','remboursement_investisseur','paiement','courant','rnd'
          )
          AND t2.status != 'cancelled'
          AND (t2.affects_compte_courant IS NOT FALSE)
          AND t2.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)
      ), 0)
    )::NUMERIC

  UNION ALL

  -- CAPEX Réserve — ALIGNÉ sur v_capex_summary (onglet Administration > CAPEX) :
  --   reçu    = payment_source = 'capex' AND amount > 0
  --   dépensé = category       = 'capex' AND amount < 0
  --   solde   = reçu + dépensé (les dépenses sont négatives)
  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    COALESCE(SUM(CASE
      WHEN t.payment_source = 'capex' AND t.amount > 0 THEN t.amount
      WHEN t.category       = 'capex' AND t.amount < 0 THEN t.amount
      ELSE 0
    END), 0)::NUMERIC
  FROM transactions t
  WHERE (t.payment_source = 'capex' OR t.category = 'capex')
    AND t.status != 'cancelled'
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Dépenses Projets
  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND t.status != 'cancelled'
    AND (t.affects_compte_courant IS NOT FALSE)
    AND t.type IN ('achat_propriete','capex','maintenance','admin','depense','paiement')
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Coûts Opération
  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('maintenance','admin','depense')
    AND t.property_id IS NULL
    AND t.status != 'cancelled'
    AND (t.affects_compte_courant IS NOT FALSE)
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

COMMENT ON FUNCTION get_financial_summary(INTEGER, UUID) IS
  'KPIs financiers — formule mig 120 + CAPEX aligné sur v_capex_summary (mig 215) + filtre tenant.';
GRANT EXECUTE ON FUNCTION get_financial_summary(INTEGER, UUID) TO authenticated, anon;

-- =====================================================
-- Vérification (lecture seule) — comparer la carte et l'onglet pour l'org courante.
-- SELECT result_category, result_value FROM get_financial_summary(NULL) WHERE result_category = 'capex';
-- SELECT SUM(capex_balance) FROM v_capex_summary;   -- doit correspondre
-- =====================================================
