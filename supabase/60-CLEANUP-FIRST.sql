-- =====================================================
-- SCRIPT DE NETTOYAGE POUR 60-corporate-book.sql
-- À exécuter AVANT le script 60 si vous devez recréer les tables
-- Date: 2025-10-24
-- =====================================================

-- Supprimer la vue en premier (dépend des tables)
DROP VIEW IF EXISTS corporate_book_view;

-- Supprimer les tables (CASCADE pour supprimer les contraintes)
DROP TABLE IF EXISTS corporate_book_documents CASCADE;
DROP TABLE IF EXISTS corporate_book CASCADE;

-- Supprimer les fonctions/triggers s'ils existent
DROP FUNCTION IF EXISTS update_corporate_book_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_corporate_book_has_documents() CASCADE;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ NETTOYAGE TERMINÉ';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Éléments supprimés:';
  RAISE NOTICE '  - Vue: corporate_book_view';
  RAISE NOTICE '  - Table: corporate_book_documents';
  RAISE NOTICE '  - Table: corporate_book';
  RAISE NOTICE '  - Fonctions et triggers associés';
  RAISE NOTICE '';
  RAISE NOTICE 'Vous pouvez maintenant exécuter:';
  RAISE NOTICE '  60-corporate-book.sql';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
