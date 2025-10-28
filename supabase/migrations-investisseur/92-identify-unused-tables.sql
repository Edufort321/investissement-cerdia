-- =====================================================
-- SCRIPT 92: IDENTIFIER LES TABLES INUTILES
-- Date: 2025-01-28
-- Description: Analyse les tables pour identifier celles
--              qui sont inutilisées ou obsolètes
-- =====================================================

-- =====================================================
-- ÉTAPE 1: LISTER TOUTES LES TABLES
-- =====================================================

SELECT
  '📋 TOUTES LES TABLES' AS etape,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS taille
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- ÉTAPE 2: TABLES VIDES (POTENTIELLEMENT INUTILES)
-- =====================================================

DO $$
DECLARE
  v_table RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '📊 TABLES VIDES:';
  RAISE NOTICE '';

  FOR v_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(v_table.tablename) INTO v_count;

    IF v_count = 0 THEN
      RAISE NOTICE '❌ % (0 lignes) - POTENTIELLEMENT INUTILE', v_table.tablename;
    END IF;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- ÉTAPE 3: TABLES LIÉES AU SYSTÈME VOYAGE (NON UTILISÉES DANS INVESTISSEMENT)
-- =====================================================

SELECT
  '🧳 TABLES SYSTÈME VOYAGE (non utilisées pour investissement)' AS etape,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'voyages',
    'evenements',
    'depenses',
    'checklist',
    'photos',
    'partage',
    'destinations',
    'destinations_voyage',
    'invites',
    'notifications',
    'subscriptions',
    'user_stats'
  )
ORDER BY tablename;

-- =====================================================
-- ÉTAPE 4: COMPTER LES LIGNES PAR TABLE
-- =====================================================

DO $$
DECLARE
  v_table RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '📊 NOMBRE DE LIGNES PAR TABLE:';
  RAISE NOTICE '';

  FOR v_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(v_table.tablename) INTO v_count;
    RAISE NOTICE '   % : % lignes', RPAD(v_table.tablename, 40), v_count;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- ÉTAPE 5: RECOMMANDATIONS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '💡 RECOMMANDATIONS:';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  TABLES À NE JAMAIS SUPPRIMER (essentielles):';
  RAISE NOTICE '   - investors (données investisseurs)';
  RAISE NOTICE '   - investor_investments (historique parts)';
  RAISE NOTICE '   - transactions (toutes les transactions)';
  RAISE NOTICE '   - properties (propriétés immobilières)';
  RAISE NOTICE '   - payment_schedules (échéanciers)';
  RAISE NOTICE '   - share_settings (valeur nominale)';
  RAISE NOTICE '   - investor_debts (dettes - nouvelle)';
  RAISE NOTICE '   - transaction_attachments (pièces jointes)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ TABLES PEUT-ÊTRE INUTILES (si 0 lignes):';
  RAISE NOTICE '   - capex_accounts (si pas utilisé)';
  RAISE NOTICE '   - current_accounts (si pas utilisé)';
  RAISE NOTICE '   - rnd_accounts (si pas utilisé)';
  RAISE NOTICE '   - dividends + dividend_allocations (si pas de dividendes)';
  RAISE NOTICE '   - operational_expenses (si pas utilisé)';
  RAISE NOTICE '   - reports (si pas de rapports générés)';
  RAISE NOTICE '';
  RAISE NOTICE '🧳 TABLES VOYAGE (SI APPLICATION VOYAGE PAS UTILISÉE):';
  RAISE NOTICE '   - voyages, evenements, depenses, checklist, photos, partage';
  RAISE NOTICE '   - destinations, destinations_voyage, invites';
  RAISE NOTICE '   - notifications, subscriptions, user_stats';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  AVANT DE SUPPRIMER:';
  RAISE NOTICE '   1. Vérifiez que la table a 0 lignes';
  RAISE NOTICE '   2. Vérifiez qu''aucune autre table ne référence cette table (foreign keys)';
  RAISE NOTICE '   3. Faites un backup de la base de données';
  RAISE NOTICE '   4. Supprimez une table à la fois';
  RAISE NOTICE '';
END $$;
