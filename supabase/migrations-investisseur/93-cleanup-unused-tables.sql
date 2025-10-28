-- =====================================================
-- SCRIPT 93: NETTOYAGE TABLES INUTILES (OPTIONNEL)
-- Date: 2025-01-28
-- Description: Supprime les tables inutiles de manière sécurisée
--              ⚠️  ATTENTION: Exécutez ÉTAPE PAR ÉTAPE
--              ⚠️  Vérifiez d'abord avec le script 92
-- =====================================================

-- ⚠️⚠️⚠️ AVERTISSEMENT ⚠️⚠️⚠️
-- Ce script supprime des tables de manière PERMANENTE
-- Assurez-vous d'avoir:
-- 1. Fait un backup de votre base de données
-- 2. Exécuté le script 92 pour identifier les tables vides
-- 3. Vérifié que vous n'en avez plus besoin

-- =====================================================
-- OPTION 1: SUPPRIMER LES TABLES VOYAGE (si pas utilisées)
-- =====================================================

-- Décommentez les lignes suivantes SEULEMENT si vous êtes SÛR
-- de ne pas utiliser le système de voyage

-- DROP TABLE IF EXISTS photos CASCADE;
-- DROP TABLE IF EXISTS depenses CASCADE;
-- DROP TABLE IF EXISTS evenements CASCADE;
-- DROP TABLE IF EXISTS checklist CASCADE;
-- DROP TABLE IF EXISTS partage CASCADE;
-- DROP TABLE IF EXISTS destinations_voyage CASCADE;
-- DROP TABLE IF EXISTS destinations CASCADE;
-- DROP TABLE IF EXISTS invites CASCADE;
-- DROP TABLE IF EXISTS voyages CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS user_stats CASCADE;

-- SELECT 'Tables VOYAGE supprimées' AS resultat;

-- =====================================================
-- OPTION 2: SUPPRIMER TABLES INVESTISSEMENT INUTILISÉES
-- =====================================================

-- Décommentez SEULEMENT si vous êtes SÛR que ces tables sont vides
-- et que vous ne les utiliserez jamais

-- A. Dividendes (si jamais utilisé)
-- DROP TABLE IF EXISTS dividend_allocations CASCADE;
-- DROP TABLE IF EXISTS dividends CASCADE;

-- B. Comptes (si jamais utilisé)
-- DROP TABLE IF EXISTS capex_accounts CASCADE;
-- DROP TABLE IF EXISTS current_accounts CASCADE;
-- DROP TABLE IF EXISTS rnd_accounts CASCADE;

-- C. Dépenses opérationnelles (si jamais utilisé)
-- DROP TABLE IF EXISTS operational_expenses CASCADE;

-- D. Rapports (si jamais utilisé)
-- DROP TABLE IF EXISTS reports CASCADE;

-- E. Documents (si système de pièces jointes différent)
-- DROP TABLE IF EXISTS documents CASCADE;

-- SELECT 'Tables investissement inutilisées supprimées' AS resultat;

-- =====================================================
-- OPTION 3: NETTOYER LES ANCIENNES MIGRATIONS/TABLES DE TEST
-- =====================================================

-- Tables potentiellement créées pendant les tests
-- DROP TABLE IF EXISTS test_table CASCADE;
-- DROP TABLE IF EXISTS tmp_investors CASCADE;
-- DROP TABLE IF EXISTS backup_transactions CASCADE;

-- =====================================================
-- OPTION 4: SUPPRESSION SÉCURISÉE TABLE PAR TABLE
-- =====================================================

-- Pour supprimer une table spécifique de manière sécurisée:
-- 1. Vérifier le nombre de lignes
-- 2. Vérifier les foreign keys
-- 3. Supprimer

-- Exemple pour "operational_expenses":
DO $$
DECLARE
  v_count INTEGER;
  v_fkeys TEXT;
BEGIN
  -- Vérifier nombre de lignes
  SELECT COUNT(*) INTO v_count FROM operational_expenses;

  IF v_count = 0 THEN
    RAISE NOTICE '✅ operational_expenses a 0 lignes, suppression sécurisée';

    -- Vérifier les foreign keys pointant vers cette table
    SELECT string_agg(conname, ', ')
    INTO v_fkeys
    FROM pg_constraint
    WHERE confrelid = 'operational_expenses'::regclass;

    IF v_fkeys IS NULL THEN
      RAISE NOTICE '✅ Aucune foreign key ne pointe vers cette table';
      -- Décommentez la ligne suivante pour supprimer
      -- DROP TABLE operational_expenses CASCADE;
      -- RAISE NOTICE '✅ Table operational_expenses supprimée';
    ELSE
      RAISE NOTICE '⚠️  Foreign keys trouvées: %', v_fkeys;
      RAISE NOTICE '⚠️  Supprimez d''abord les contraintes ou utilisez CASCADE';
    END IF;
  ELSE
    RAISE NOTICE '❌ operational_expenses contient % lignes, suppression ANNULÉE', v_count;
  END IF;
END $$;

-- =====================================================
-- VÉRIFICATION POST-SUPPRESSION
-- =====================================================

-- Lister les tables restantes
SELECT
  '📋 TABLES RESTANTES' AS etape,
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS taille
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- MESSAGE FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RAPPEL IMPORTANT:';
  RAISE NOTICE '';
  RAISE NOTICE '   Ce script est fourni COMMENTÉ par sécurité';
  RAISE NOTICE '   Décommentez SEULEMENT les tables que vous êtes SÛR de vouloir supprimer';
  RAISE NOTICE '';
  RAISE NOTICE '   Recommandations:';
  RAISE NOTICE '   1. Exécutez d''abord le script 92 pour identifier les tables vides';
  RAISE NOTICE '   2. Faites un backup de votre base de données';
  RAISE NOTICE '   3. Décommentez UNE table à la fois';
  RAISE NOTICE '   4. Vérifiez après chaque suppression';
  RAISE NOTICE '';
END $$;
