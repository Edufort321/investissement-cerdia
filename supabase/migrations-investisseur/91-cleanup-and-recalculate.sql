-- =====================================================
-- SCRIPT 91: NETTOYAGE ET RECALCUL DES DONNÉES
-- Date: 2025-01-28
-- Description: Nettoie les doublons et recalcule les totaux
--              À exécuter APRÈS la migration 90
-- =====================================================

\echo ''
\echo '🧹 Script 91: Nettoyage et recalcul des données'
\echo ''

-- =====================================================
-- ÉTAPE 1: AFFICHER L'ÉTAT ACTUEL AVANT NETTOYAGE
-- =====================================================

\echo '📊 État actuel AVANT nettoyage:'
\echo ''

SELECT
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.shares_purchased), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  COUNT(ii.id) AS nombre_investissements
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id AND ii.status = 'active'
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested
ORDER BY i.first_name, i.last_name;

\echo ''
\echo '🔍 Recherche des doublons...'
\echo ''

SELECT
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

\echo ''
\echo '🧹 Nettoyage des doublons en cours...'
\echo ''

SELECT * FROM clean_duplicate_investments();

\echo ''
\echo '✅ Doublons nettoyés'
\echo ''

-- =====================================================
-- ÉTAPE 3: RECALCULER TOUS LES INVESTISSEURS
-- =====================================================

\echo '🔄 Recalcul de tous les investisseurs...'
\echo ''

SELECT
  investor_name,
  old_shares AS anciennes_parts,
  new_shares AS nouvelles_parts,
  old_invested AS ancien_montant,
  new_invested AS nouveau_montant,
  (new_shares - old_shares) AS diff_parts,
  (new_invested - old_invested) AS diff_montant
FROM recalculate_all_investors()
ORDER BY investor_name;

\echo ''
\echo '✅ Recalcul terminé'
\echo ''

-- =====================================================
-- ÉTAPE 4: AFFICHER L'ÉTAT APRÈS CORRECTION
-- =====================================================

\echo '📊 État actuel APRÈS correction:'
\echo ''

SELECT
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.shares_purchased), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  COUNT(ii.id) AS nombre_investissements,
  -- Vérification cohérence
  CASE
    WHEN ABS(i.total_shares - COALESCE(SUM(ii.shares_purchased), 0)) < 0.01
      AND ABS(i.total_invested - COALESCE(SUM(ii.amount_invested), 0)) < 0.01
    THEN '✅ OK'
    ELSE '❌ INCOHÉRENT'
  END AS statut
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id AND ii.status = 'active'
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested
ORDER BY i.first_name, i.last_name;

\echo ''
\echo '📊 Vérification transactions sans parts créées...'
\echo ''

-- Trouver transactions de type 'investissement' sans entrée dans investor_investments
SELECT
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

\echo ''
\echo '✅ ============================================='
\echo '✅ NETTOYAGE ET RECALCUL TERMINÉS'
\echo '✅ ============================================='
\echo ''
\echo '📋 Prochaines étapes:'
\echo '   1. Vérifiez les résultats ci-dessus'
\echo '   2. Si tout est OK (✅), passez à l''interface'
\echo '   3. Si incohérences (❌), contactez le support'
\echo ''
