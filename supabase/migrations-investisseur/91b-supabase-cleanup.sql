-- =====================================================
-- SCRIPT 91B: NETTOYAGE ET RECALCUL (VERSION SUPABASE)
-- Date: 2025-01-28
-- Description: Nettoie les doublons et recalcule les totaux
--              À exécuter APRÈS la migration 90b
--              Version compatible éditeur SQL Supabase
-- =====================================================

-- =====================================================
-- ÉTAPE 1: AFFICHER L'ÉTAT ACTUEL AVANT NETTOYAGE
-- =====================================================

-- État actuel AVANT nettoyage
SELECT
  '📊 ÉTAT AVANT NETTOYAGE' AS etape,
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.shares_purchased), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  i.current_value AS valeur_actuelle,
  i.share_value AS valeur_par_part,
  COUNT(ii.id) AS nombre_investissements
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id AND ii.status = 'active'
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested, i.current_value, i.share_value
ORDER BY i.first_name, i.last_name;

-- Recherche des doublons
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
-- ÉTAPE 2: NETTOYER LES DOUBLONS
-- =====================================================

SELECT
  '🧹 NETTOYAGE DES DOUBLONS' AS etape,
  *
FROM clean_duplicate_investments();

-- =====================================================
-- ÉTAPE 3: RECALCULER TOUS LES INVESTISSEURS
-- =====================================================

SELECT
  '🔄 RECALCUL DES INVESTISSEURS' AS etape,
  investor_name,
  old_shares AS anciennes_parts,
  new_shares AS nouvelles_parts,
  old_invested AS ancien_montant,
  new_invested AS nouveau_montant,
  (new_shares - old_shares) AS diff_parts,
  (new_invested - old_invested) AS diff_montant
FROM recalculate_all_investors()
ORDER BY investor_name;

-- =====================================================
-- ÉTAPE 4: AFFICHER L'ÉTAT APRÈS CORRECTION
-- =====================================================

SELECT
  '📊 ÉTAT APRÈS CORRECTION' AS etape,
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.shares_purchased), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  i.current_value AS valeur_actuelle,
  i.share_value AS valeur_par_part,
  COUNT(ii.id) AS nombre_investissements,
  -- Vérification cohérence
  CASE
    WHEN ABS(i.total_shares - COALESCE(SUM(ii.shares_purchased), 0)) < 0.01
      AND ABS(i.total_invested - COALESCE(SUM(ii.amount_invested), 0)) < 0.01
    THEN '✅ OK'
    ELSE '❌ INCOHÉRENT'
  END AS statut,
  -- ROI calculé
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
-- ÉTAPE 5: VÉRIFIER TRANSACTIONS SANS PARTS
-- =====================================================

SELECT
  '🔍 TRANSACTIONS INVESTISSEMENT SANS PARTS' AS etape,
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
-- ÉTAPE 6: RÉSUMÉ GLOBAL
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

-- Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ NETTOYAGE ET RECALCUL TERMINÉS';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Vérifiez les résultats ci-dessus:';
  RAISE NOTICE '   - Tous les investisseurs doivent avoir le statut ✅ OK';
  RAISE NOTICE '   - La valeur actuelle doit être = parts × valeur_par_part';
  RAISE NOTICE '   - Le ROI doit être cohérent';
  RAISE NOTICE '';
END $$;
