-- =====================================================
-- MIGRATION 91 FINALE: NETTOYAGE ET RECALCUL
-- Date: 2025-01-28
-- Description: Nettoie doublons et recalcule tous les totaux
-- À exécuter APRÈS 90-FINAL.sql
-- =====================================================

-- =====================================================
-- ÉTAPE 1: ÉTAT AVANT NETTOYAGE
-- =====================================================

SELECT
  '📊 ÉTAT AVANT NETTOYAGE' AS etape,
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.number_of_shares), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  i.current_value AS valeur_actuelle,
  i.share_value AS valeur_par_part,
  COUNT(ii.id) AS nombre_investissements
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id AND ii.status = 'active'
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested, i.current_value, i.share_value
ORDER BY i.first_name, i.last_name;

-- =====================================================
-- ÉTAPE 2: RECHERCHE DOUBLONS
-- =====================================================

SELECT
  '🔍 DOUBLONS DÉTECTÉS' AS etape,
  investor_id,
  investment_date::date,
  amount_invested,
  COUNT(*) AS nombre_doublons
FROM investor_investments
GROUP BY investor_id, investment_date::date, amount_invested
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- =====================================================
-- ÉTAPE 3: NETTOYAGE
-- =====================================================

SELECT '🧹 NETTOYAGE' AS etape, * FROM clean_duplicate_investments();

-- =====================================================
-- ÉTAPE 4: RECALCUL
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
-- ÉTAPE 5: ÉTAT APRÈS CORRECTION
-- =====================================================

SELECT
  '📊 ÉTAT APRÈS CORRECTION' AS etape,
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
  END AS statut,
  CASE
    WHEN i.total_invested > 0 THEN
      ROUND(((i.current_value - i.total_invested) / i.total_invested * 100)::numeric, 2)
    ELSE 0
  END AS roi_pourcent
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id AND ii.status = 'active'
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested, i.current_value, i.share_value
ORDER BY i.first_name, i.last_name;

-- =====================================================
-- ÉTAPE 6: TRANSACTIONS SANS PARTS
-- =====================================================

SELECT
  '🔍 TRANSACTIONS SANS PARTS' AS etape,
  t.id AS transaction_id,
  t.date,
  t.type,
  t.amount,
  t.description,
  i.first_name || ' ' || i.last_name AS investisseur
FROM transactions t
LEFT JOIN investors i ON t.investor_id = i.id
LEFT JOIN investor_investments ii ON t.id = ii.transaction_id
WHERE t.type = 'investissement'
  AND t.investor_id IS NOT NULL
  AND ii.id IS NULL;

-- =====================================================
-- ÉTAPE 7: RÉSUMÉ GLOBAL
-- =====================================================

SELECT
  '📊 RÉSUMÉ GLOBAL' AS etape,
  COUNT(*) AS total_investisseurs,
  SUM(total_shares) AS total_parts_emises,
  SUM(total_invested) AS total_investi,
  SUM(current_value) AS total_valeur_actuelle,
  ROUND(AVG(share_value)::numeric, 4) AS valeur_moyenne_part,
  CASE
    WHEN SUM(total_invested) > 0 THEN
      ROUND(((SUM(current_value) - SUM(total_invested)) / SUM(total_invested) * 100)::numeric, 2)
    ELSE 0
  END AS roi_global_pourcent
FROM investors;

-- =====================================================
-- FIN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ MIGRATION 91 TERMINÉE';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Vérifiez que tous les investisseurs ont: ✅ OK';
  RAISE NOTICE '';
END $$;
