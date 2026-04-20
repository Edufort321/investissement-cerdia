-- ==========================================
-- MIGRATION 98: CRÉER FONCTION get_financial_summary
-- ==========================================
--
-- PROBLÈME: La fonction get_financial_summary n'existe pas
--           Le dashboard affiche des valeurs incorrectes pour le Compte Courant
--
-- SOLUTION: Créer la fonction SQL qui calcule les KPIs financiers
--           basés sur les vraies transactions
--
-- ==========================================

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS get_financial_summary(integer);
DROP FUNCTION IF EXISTS get_financial_summary();

CREATE OR REPLACE FUNCTION get_financial_summary(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
  result_category TEXT,
  result_metric TEXT,
  result_value NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  -- Total Investisseurs
  SELECT
    'investissement'::TEXT,
    'Total Investisseurs'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'investissement'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Compte Courant Balance
  -- MÊME LOGIQUE QUE ADMINISTRATION/TRANSACTIONS: totalIn - totalOut
  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      -- Entrées (investissement + dividende)
      COALESCE((SELECT SUM(t1.amount) FROM transactions t1 WHERE t1.type IN ('investissement', 'dividende') AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)), 0)
      -
      -- Sorties (paiement + depense) - TOUTES, pas seulement sans property_id
      COALESCE((SELECT SUM(ABS(t2.amount)) FROM transactions t2 WHERE t2.type IN ('paiement', 'depense') AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)), 0)
    )::NUMERIC

  UNION ALL

  -- CAPEX Balance
  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    (
      COALESCE((SELECT SUM(t4.amount) FROM transactions t4 WHERE t4.payment_source = 'capex' AND t4.amount > 0 AND (p_year IS NULL OR EXTRACT(YEAR FROM t4.date)::INTEGER = p_year)), 0)
      -
      COALESCE((SELECT SUM(ABS(t5.amount)) FROM transactions t5 WHERE t5.category = 'capex' AND t5.amount < 0 AND (p_year IS NULL OR EXTRACT(YEAR FROM t5.date)::INTEGER = p_year)), 0)
    )::NUMERIC

  UNION ALL

  -- Dépenses Projets
  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Coûts Opération (dépenses non liées à une propriété)
  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('paiement', 'depense')
    AND t.property_id IS NULL
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

COMMENT ON FUNCTION get_financial_summary(INTEGER) IS
  'Calcule le résumé financier global basé sur les vraies transactions';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 98 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Fonction get_financial_summary créée';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Calculs basés sur les vraies transactions:';
  RAISE NOTICE '   • Total Investisseurs = transactions type investissement';
  RAISE NOTICE '   • Dépenses Projets = transactions avec property_id';
  RAISE NOTICE '   • Dépenses Opération = paiements/dépenses SANS property_id';
  RAISE NOTICE '   • Compte Courant = Investisseurs - Projets - Opération';
  RAISE NOTICE '   • CAPEX = transactions avec payment_source ou category capex';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Le dashboard affiche maintenant les vrais montants';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
