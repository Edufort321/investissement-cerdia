-- =====================================================
-- SCRIPT 51-CLEANUP : NETTOYAGE DES ANCIENNES DONNÉES
--
-- ⚠️ EXÉCUTER CE SCRIPT EN PREMIER ⚠️
--
-- Ce script supprime toutes les données de prix projetés
-- et réinitialise le système pour le calcul automatique.
--
-- Date: 2025-10-24
-- =====================================================

-- =====================================================
-- 1. AFFICHER LES PRIX ACTUELS (pour vérification)
-- =====================================================

DO $$
DECLARE
  v_count INT;
  v_latest_price DECIMAL(10, 4);
  v_latest_date DATE;
BEGIN
  SELECT COUNT(*), MAX(share_price), MAX(effective_date)
  INTO v_count, v_latest_price, v_latest_date
  FROM share_price_history
  WHERE published = TRUE;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'ÉTAT ACTUEL AVANT NETTOYAGE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Nombre de prix en historique : %', v_count;
  RAISE NOTICE 'Dernier prix publié : % $', v_latest_price;
  RAISE NOTICE 'Date du dernier prix : %', v_latest_date;
  RAISE NOTICE '';
  RAISE NOTICE 'Ces données vont être SUPPRIMÉES...';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

-- Afficher les 5 derniers prix pour vérification
SELECT
  effective_date,
  share_price,
  revision_type,
  published,
  notes
FROM share_price_history
ORDER BY effective_date DESC
LIMIT 5;

-- =====================================================
-- 2. SUPPRIMER TOUTES LES DONNÉES DE PRIX
-- =====================================================

-- Supprimer TOUS les prix (projetés ou non)
DELETE FROM share_price_history;

-- =====================================================
-- 3. CONFIRMATION
-- =====================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM share_price_history;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'NETTOYAGE TERMINÉ';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Nombre de prix restants : %', v_count;
  RAISE NOTICE '';

  IF v_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS : Base de données nettoyée !';
    RAISE NOTICE '';
    RAISE NOTICE 'Prochaine étape :';
    RAISE NOTICE 'Exécuter le script : 51-automatic-nav-calculation.sql';
  ELSE
    RAISE NOTICE '⚠️ WARNING : Il reste % prix dans la base', v_count;
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
