-- =====================================================
-- MIGRATION 94: NETTOYAGE DES INVESTISSEMENTS ORPHELINS
-- Date: 2025-01-28
-- Description: Supprime les entrées dans investor_investments
--              dont la transaction n'existe plus
-- =====================================================

-- =====================================================
-- ÉTAPE 1: IDENTIFIER LES INVESTISSEMENTS ORPHELINS
-- =====================================================

SELECT
  '🔍 INVESTISSEMENTS ORPHELINS DÉTECTÉS' AS etape,
  ii.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  ii.investment_date,
  ii.amount_invested,
  ii.number_of_shares,
  ii.transaction_id,
  CASE
    WHEN ii.transaction_id IS NULL THEN 'Pas de transaction_id'
    WHEN t.id IS NULL THEN 'Transaction supprimée'
    ELSE 'OK'
  END AS statut
FROM investor_investments ii
LEFT JOIN investors i ON ii.investor_id = i.id
LEFT JOIN transactions t ON ii.transaction_id = t.id
WHERE ii.transaction_id IS NULL
   OR t.id IS NULL;

-- =====================================================
-- ÉTAPE 2: ÉTAT AVANT NETTOYAGE
-- =====================================================

SELECT
  '📊 ÉTAT AVANT NETTOYAGE' AS etape,
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.number_of_shares), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  COUNT(ii.id) AS nombre_investissements
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested
HAVING i.total_shares > 0 OR COUNT(ii.id) > 0
ORDER BY i.first_name, i.last_name;

-- =====================================================
-- ÉTAPE 3: SUPPRESSION DES ORPHELINS
-- =====================================================

DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Supprimer les investissements dont la transaction n'existe plus
  WITH deleted AS (
    DELETE FROM investor_investments ii
    WHERE ii.transaction_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM transactions t WHERE t.id = ii.transaction_id
       )
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RAISE NOTICE '🗑️ Investissements orphelins supprimés: %', v_deleted_count;
END $$;

-- =====================================================
-- ÉTAPE 4: RECALCUL DE TOUS LES INVESTISSEURS
-- =====================================================

SELECT
  '🔄 RECALCUL' AS etape,
  investor_name,
  old_shares AS anciennes_parts,
  new_shares AS nouvelles_parts,
  (new_shares - old_shares) AS diff_parts
FROM recalculate_all_investors()
ORDER BY investor_name;

-- =====================================================
-- ÉTAPE 5: ÉTAT APRÈS NETTOYAGE
-- =====================================================

SELECT
  '📊 ÉTAT APRÈS NETTOYAGE' AS etape,
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.number_of_shares), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  i.current_value AS valeur_actuelle,
  i.share_value AS valeur_par_part,
  COUNT(ii.id) AS nombre_investissements,
  CASE
    WHEN ABS(i.total_shares - COALESCE(SUM(ii.number_of_shares), 0)) < 0.01
      AND ABS(i.total_invested - COALESCE(SUM(ii.amount_invested), 0)) < 0.01
    THEN '✅ OK'
    ELSE '❌ INCOHÉRENT'
  END AS statut
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id AND ii.status = 'active'
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested, i.current_value, i.share_value
ORDER BY i.first_name, i.last_name;

-- =====================================================
-- ÉTAPE 6: VÉRIFIER QUE LES TRIGGERS FONCTIONNENT
-- =====================================================

SELECT
  '🔍 VÉRIFICATION DES TRIGGERS' AS etape,
  trigger_name,
  event_manipulation AS evenement,
  action_statement AS fonction
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND trigger_name LIKE '%investor%'
ORDER BY trigger_name;

-- =====================================================
-- FIN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ MIGRATION 94 TERMINÉE';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tous les investisseurs devraient maintenant avoir:';
  RAISE NOTICE '   - Parts = 0';
  RAISE NOTICE '   - Total investi = 0$';
  RAISE NOTICE '   - Valeur actuelle = 0$';
  RAISE NOTICE '   - ROI = 0%%';
  RAISE NOTICE '';
END $$;
