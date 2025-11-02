-- ==========================================
-- FIX: CORRECTION ERREUR D'AMBIGUÏTÉ COLONNE "category"
-- Migration 98: Corriger la fonction get_financial_summary
-- Erreur: column reference "category" is ambiguous
-- ==========================================

-- Recréer la fonction avec colonnes qualifiées
CREATE OR REPLACE FUNCTION get_financial_summary(p_year INTEGER DEFAULT NULL)
RETURNS TABLE(
  metric TEXT,
  value DECIMAL(15, 2),
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Total Investisseurs' AS metric,
    COALESCE(SUM(t.amount), 0) AS value,
    'investissement' AS category
  FROM transactions t
  WHERE t.type = 'investissement'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date) = p_year)

  UNION ALL

  SELECT
    'Compte Courant Balance' AS metric,
    COALESCE(SUM(CASE WHEN t.affects_compte_courant = TRUE THEN t.amount ELSE 0 END), 0) AS value,
    'compte_courant' AS category
  FROM transactions t
  WHERE p_year IS NULL OR EXTRACT(YEAR FROM t.date) = p_year

  UNION ALL

  SELECT
    'CAPEX Balance' AS metric,
    COALESCE(SUM(CASE
      WHEN t.payment_source = 'capex' AND t.amount > 0 THEN t.amount
      WHEN t.category = 'capex' AND t.amount < 0 THEN t.amount
      ELSE 0
    END), 0) AS value,
    'capex' AS category
  FROM transactions t
  WHERE p_year IS NULL OR EXTRACT(YEAR FROM t.date) = p_year

  UNION ALL

  SELECT
    'Dépenses Projets' AS metric,
    COALESCE(SUM(ABS(t.amount)), 0) AS value,
    'projet' AS category
  FROM transactions t
  WHERE t.category = 'projet' AND t.amount < 0  -- ✅ CORRIGÉ: t.category au lieu de category
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date) = p_year)

  UNION ALL

  SELECT
    'Coûts Opération' AS metric,
    COALESCE(SUM(ABS(t.amount)), 0) AS value,
    'operation' AS category
  FROM transactions t
  WHERE t.category IN ('operation', 'maintenance', 'admin') AND t.amount < 0  -- ✅ CORRIGÉ: t.category
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date) = p_year);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_financial_summary IS 'Résumé financier global - Correction ambiguïté colonne category';

-- ==========================================
-- Vérification: Tester la fonction
-- ==========================================
SELECT
  '✅ FONCTION CORRIGÉE' as status,
  'get_financial_summary() ne devrait plus retourner d''erreur d''ambiguïté' as message;

-- Test: Exécuter la fonction (devrait retourner des résultats à 0)
SELECT * FROM get_financial_summary();
