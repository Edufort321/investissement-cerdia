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

CREATE OR REPLACE FUNCTION get_financial_summary(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
  category TEXT,
  metric TEXT,
  value NUMERIC
) AS $$
DECLARE
  v_total_investisseurs NUMERIC;
  v_investissements_projets NUMERIC;
  v_depenses_operation NUMERIC;
  v_compte_courant_balance NUMERIC;
  v_capex_received NUMERIC;
  v_capex_spent NUMERIC;
  v_capex_balance NUMERIC;
BEGIN
  -- 1. TOTAL INVESTISSEURS (CAD)
  -- Somme des transactions de type 'investissement'
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_investisseurs
  FROM transactions
  WHERE type = 'investissement'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year);

  -- 2. INVESTISSEMENTS PROJETS (DÉPENSES PROJETS)
  -- Somme absolue des transactions liées à une propriété
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_investissements_projets
  FROM transactions
  WHERE property_id IS NOT NULL
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year);

  -- 3. DÉPENSES OPÉRATION (SANS property_id)
  -- Somme des transactions de type 'paiement' ou 'depense' SANS property_id
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_depenses_operation
  FROM transactions
  WHERE type IN ('paiement', 'depense')
    AND property_id IS NULL
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year);

  -- 4. CAPEX BALANCE
  -- Reçu (montants positifs avec payment_source='capex')
  SELECT COALESCE(SUM(amount), 0)
  INTO v_capex_received
  FROM transactions
  WHERE payment_source = 'capex'
    AND amount > 0
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year);

  -- Dépensé (montants négatifs avec category='capex')
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_capex_spent
  FROM transactions
  WHERE category = 'capex'
    AND amount < 0
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year);

  -- Balance CAPEX
  v_capex_balance := v_capex_received - v_capex_spent;

  -- 5. COMPTE COURANT BALANCE
  -- = Total Investisseurs - Investissements Projets - Dépenses Opération
  v_compte_courant_balance := v_total_investisseurs - v_investissements_projets - v_depenses_operation;

  -- RETOURNER LES RÉSULTATS
  RETURN QUERY
  SELECT 'investissement'::TEXT, 'Total Investisseurs'::TEXT, v_total_investisseurs
  UNION ALL
  SELECT 'compte_courant'::TEXT, 'Compte Courant Balance'::TEXT, v_compte_courant_balance
  UNION ALL
  SELECT 'capex'::TEXT, 'CAPEX Réserve'::TEXT, v_capex_balance
  UNION ALL
  SELECT 'projet'::TEXT, 'Dépenses Projets'::TEXT, v_investissements_projets
  UNION ALL
  SELECT 'operation'::TEXT, 'Coûts Opération'::TEXT, v_depenses_operation;
END;
$$ LANGUAGE plpgsql STABLE;

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
