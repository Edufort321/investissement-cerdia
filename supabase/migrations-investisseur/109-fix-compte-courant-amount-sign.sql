-- ==========================================
-- MIGRATION 109: CORRIGER COMPTE COURANT
-- ==========================================
--
-- Problème: get_financial_summary() avait AND t2.amount < 0 pour les sorties.
-- Les anciennes transactions paiement/depense ont des montants POSITIFS
-- (créées avant que le modal ne force le signe négatif pour les sorties).
-- Résultat: sorties = 0, solde = total investissements brut.
--
-- Fix: utiliser ABS(amount) sans filtre de signe pour toutes les sorties.
-- Les types eux-mêmes indiquent que c'est une sortie.
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 109: FIX COMPTE COURANT (suppression AND amount < 0)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

DROP FUNCTION IF EXISTS get_financial_summary(integer);
DROP FUNCTION IF EXISTS get_financial_summary();

CREATE OR REPLACE FUNCTION get_financial_summary(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
  result_category TEXT,
  result_metric    TEXT,
  result_value     NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY

  -- ── Total Investisseurs ─────────────────────────────────────────
  SELECT
    'investissement'::TEXT,
    'Total Investisseurs'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Compte Courant ──────────────────────────────────────────────
  -- Inflows: investissement + loyer + dividende  (montants positifs)
  -- Outflows: tous les types de sortie          (ABS sans filtre signe)
  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      COALESCE((
        SELECT SUM(ABS(t1.amount)) FROM transactions t1
        WHERE t1.type IN ('investissement', 'loyer', 'dividende')
          AND t1.status != 'cancelled'
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)
      ), 0)
      -
      COALESCE((
        SELECT SUM(ABS(t2.amount)) FROM transactions t2
        WHERE t2.type IN (
            'achat_propriete', 'capex', 'maintenance', 'admin',
            'depense', 'remboursement_investisseur', 'paiement'
          )
          AND t2.status != 'cancelled'
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)
      ), 0)
    )::NUMERIC

  UNION ALL

  -- ── CAPEX Réserve ───────────────────────────────────────────────
  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'capex'
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Dépenses Projets (transactions liées à une propriété) ───────
  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND t.type IN ('achat_propriete', 'capex', 'maintenance', 'admin', 'depense', 'paiement')
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Coûts Opération (dépenses sans propriété) ───────────────────
  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('maintenance', 'admin', 'depense')
    AND t.property_id IS NULL
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

COMMENT ON FUNCTION get_financial_summary(INTEGER) IS
  'KPIs financiers — ABS(amount) pour toutes sorties (compatible anciens montants positifs et nouveaux négatifs)';

-- ==========================================
-- VÉRIFICATION
-- ==========================================
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION MIGRATION 109';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  FOR v_result IN SELECT * FROM get_financial_summary(NULL) LOOP
    RAISE NOTICE '   • % = %', v_result.result_metric, v_result.result_value;
  END LOOP;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 109 TERMINÉE — compte courant ABS(amount) sans filtre signe' AS status;
