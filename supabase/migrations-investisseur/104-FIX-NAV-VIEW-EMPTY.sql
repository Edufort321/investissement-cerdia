-- ==========================================
-- FIX: Vue v_nav_summary vide (PGRST116)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSTIC NAV';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Vérifier si la table nav_history existe
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_snapshot_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'nav_history'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    SELECT COUNT(*) INTO v_snapshot_count FROM nav_history;
    RAISE NOTICE '✅ Table nav_history existe';
    RAISE NOTICE '   • Snapshots: %', v_snapshot_count;

    IF v_snapshot_count = 0 THEN
      RAISE NOTICE '⚠️ PROBLÈME: Aucun snapshot dans nav_history!';
      RAISE NOTICE '   C''est pourquoi v_nav_summary retourne 0 rows';
    END IF;
  ELSE
    RAISE NOTICE '❌ PROBLÈME: Table nav_history n''existe pas!';
    RAISE NOTICE '   → Exécutez migration 97 d''abord';
  END IF;

  RAISE NOTICE '';
END $$;

-- Vérifier si la fonction calculate_realistic_nav_v2 existe
DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'calculate_realistic_nav_v2'
      AND n.nspname = 'public'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ Fonction calculate_realistic_nav_v2 existe';
  ELSE
    RAISE NOTICE '❌ PROBLÈME: Fonction calculate_realistic_nav_v2 n''existe pas!';
    RAISE NOTICE '   → Exécutez migration 85 d''abord';
  END IF;

  RAISE NOTICE '';
END $$;

-- Vérifier si la fonction snapshot_nav existe
DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'snapshot_nav'
      AND n.nspname = 'public'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ Fonction snapshot_nav existe';
  ELSE
    RAISE NOTICE '❌ PROBLÈME: Fonction snapshot_nav n''existe pas!';
    RAISE NOTICE '   → Exécutez migration 97 d''abord';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==========================================
-- SOLUTION: Créer le premier snapshot si manquant
-- ==========================================

DO $$
DECLARE
  v_can_create_snapshot BOOLEAN := TRUE;
  v_snapshot_count INTEGER;
  v_snapshot_id UUID;
BEGIN
  -- Vérifier si on peut créer un snapshot
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nav_history') THEN
    v_can_create_snapshot := FALSE;
    RAISE NOTICE '❌ Impossible de créer snapshot: table nav_history manquante';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'snapshot_nav' AND n.nspname = 'public'
  ) THEN
    v_can_create_snapshot := FALSE;
    RAISE NOTICE '❌ Impossible de créer snapshot: fonction snapshot_nav manquante';
  END IF;

  SELECT COUNT(*) INTO v_snapshot_count FROM nav_history;

  IF v_can_create_snapshot AND v_snapshot_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 CRÉATION DU PREMIER SNAPSHOT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    BEGIN
      -- Créer le snapshot pour aujourd'hui
      SELECT snapshot_nav(CURRENT_DATE) INTO v_snapshot_id;

      RAISE NOTICE '✅ Premier snapshot créé avec succès!';
      RAISE NOTICE '   • ID: %', v_snapshot_id;
      RAISE NOTICE '   • Date: %', CURRENT_DATE;
      RAISE NOTICE '';
      RAISE NOTICE '✅ La vue v_nav_summary devrait maintenant fonctionner';

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Erreur lors de la création du snapshot:';
      RAISE NOTICE '   %', SQLERRM;
      RAISE NOTICE '';
      RAISE NOTICE '💡 Essayez de créer un snapshot manuellement:';
      RAISE NOTICE '   SELECT snapshot_nav(CURRENT_DATE);';
    END;

  ELSIF v_can_create_snapshot AND v_snapshot_count > 0 THEN
    RAISE NOTICE '✅ La table nav_history contient déjà % snapshot(s)', v_snapshot_count;
    RAISE NOTICE '   Aucune action nécessaire';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

DO $$
DECLARE
  v_summary_rows INTEGER;
  v_history_rows INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Compter les lignes dans nav_history
  SELECT COUNT(*) INTO v_history_rows FROM nav_history;
  RAISE NOTICE '📊 nav_history: % ligne(s)', v_history_rows;

  -- Essayer de compter les lignes dans v_nav_summary
  BEGIN
    SELECT COUNT(*) INTO v_summary_rows FROM v_nav_summary;
    RAISE NOTICE '📊 v_nav_summary: % ligne(s)', v_summary_rows;

    IF v_summary_rows > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '✅✅✅ SUCCÈS! ✅✅✅';
      RAISE NOTICE '';
      RAISE NOTICE 'La vue v_nav_summary fonctionne maintenant.';
      RAISE NOTICE 'L''erreur PGRST116 devrait être résolue.';
    ELSE
      RAISE NOTICE '';
      RAISE NOTICE '⚠️ La vue v_nav_summary est toujours vide';
      RAISE NOTICE 'Vérifiez que nav_history contient au moins une ligne';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors de la lecture de v_nav_summary:';
    RAISE NOTICE '   %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE '💡 La vue n''existe peut-être pas. Exécutez migration 97.';
  END;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES SI ERREUR PERSISTE:';
  RAISE NOTICE '   1. Assurez-vous que migration 85 est exécutée';
  RAISE NOTICE '   2. Assurez-vous que migration 97 est exécutée';
  RAISE NOTICE '   3. Rafraîchir la page Administration/NAV (F5)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
