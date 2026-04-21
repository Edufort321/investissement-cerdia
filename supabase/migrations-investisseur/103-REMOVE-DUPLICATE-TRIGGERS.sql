-- ==========================================
-- SUPPRIMER LES TRIGGERS EN DOUBLE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 TRIGGERS TROUVÉS (AVANT NETTOYAGE)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'INSERT Triggers:';
  RAISE NOTICE '  • auto_create_investor_shares';
  RAISE NOTICE '  • auto_create_investor_shares_from_transactions';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATE Triggers:';
  RAISE NOTICE '  • auto_update_investor_shares';
  RAISE NOTICE '  • auto_update_investor_shares_on_transaction_update';
  RAISE NOTICE '';
  RAISE NOTICE 'DELETE Triggers:';
  RAISE NOTICE '  • auto_delete_investor_shares';
  RAISE NOTICE '  • auto_delete_investor_shares_on_transaction_delete';
  RAISE NOTICE '';
  RAISE NOTICE '❌ PROBLÈME: Chaque action s''exécute 2 FOIS!';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- SUPPRIMER LES TRIGGERS COURTS (les doublons)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🗑️ SUPPRESSION DES TRIGGERS EN DOUBLE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Supprimer les triggers courts (versions en double)
DROP TRIGGER IF EXISTS auto_create_investor_shares ON transactions;
DROP TRIGGER IF EXISTS auto_update_investor_shares ON transactions;
DROP TRIGGER IF EXISTS auto_delete_investor_shares ON transactions;

DO $$
BEGIN
  RAISE NOTICE '  ✓ auto_create_investor_shares (doublon) supprimé';
  RAISE NOTICE '  ✓ auto_update_investor_shares (doublon) supprimé';
  RAISE NOTICE '  ✓ auto_delete_investor_shares (doublon) supprimé';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Triggers en double supprimés';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- NETTOYER LES DOUBLONS DANS investor_investments
-- ==========================================

DO $$
DECLARE
  v_total_before INTEGER;
  v_deleted INTEGER := 0;
  v_orphaned INTEGER := 0;
  v_total_after INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🧹 NETTOYAGE DES DOUBLONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO v_total_before FROM investor_investments;
  RAISE NOTICE '  État initial: % entrées', v_total_before;

  -- Supprimer les doublons (garder le plus récent)
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY transaction_id ORDER BY created_at DESC) as rn
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
  )
  DELETE FROM investor_investments
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '  ✓ Doublons supprimés: %', v_deleted;

  -- Supprimer les orphelins
  DELETE FROM investor_investments
  WHERE transaction_id IS NULL;

  GET DIAGNOSTICS v_orphaned = ROW_COUNT;
  RAISE NOTICE '  ✓ Entrées orphelines supprimées: %', v_orphaned;

  SELECT COUNT(*) INTO v_total_after FROM investor_investments;
  RAISE NOTICE '';
  RAISE NOTICE '  État final: % entrées', v_total_after;
  RAISE NOTICE '  Total supprimé: %', v_total_before - v_total_after;
  RAISE NOTICE '';
END $$;

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

DO $$
DECLARE
  v_insert_triggers INTEGER;
  v_update_triggers INTEGER;
  v_delete_triggers INTEGER;
  v_total INTEGER;
  v_duplicates INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Compter les triggers par type
  SELECT COUNT(*) INTO v_insert_triggers
  FROM pg_trigger
  WHERE tgrelid = 'transactions'::regclass
    AND tgisinternal = false
    AND pg_get_triggerdef(oid) LIKE '%INSERT%'
    AND tgname LIKE '%investor_shares%';

  SELECT COUNT(*) INTO v_update_triggers
  FROM pg_trigger
  WHERE tgrelid = 'transactions'::regclass
    AND tgisinternal = false
    AND pg_get_triggerdef(oid) LIKE '%UPDATE%'
    AND tgname LIKE '%investor_shares%';

  SELECT COUNT(*) INTO v_delete_triggers
  FROM pg_trigger
  WHERE tgrelid = 'transactions'::regclass
    AND tgisinternal = false
    AND pg_get_triggerdef(oid) LIKE '%DELETE%'
    AND tgname LIKE '%investor_shares%';

  RAISE NOTICE '📊 Triggers actifs pour investor_shares:';
  RAISE NOTICE '   • INSERT triggers: % (devrait être 1)', v_insert_triggers;
  RAISE NOTICE '   • UPDATE triggers: % (devrait être 1)', v_update_triggers;
  RAISE NOTICE '   • DELETE triggers: % (devrait être 1)', v_delete_triggers;
  RAISE NOTICE '';

  -- État de investor_investments
  SELECT COUNT(*) INTO v_total FROM investor_investments;

  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT transaction_id, COUNT(*) as cnt
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
    HAVING COUNT(*) > 1
  ) dups;

  RAISE NOTICE '📊 investor_investments:';
  RAISE NOTICE '   • Total entrées: %', v_total;
  RAISE NOTICE '   • Doublons: %', v_duplicates;
  RAISE NOTICE '';

  IF v_insert_triggers = 1 AND v_update_triggers = 1 AND v_delete_triggers = 1 AND v_duplicates = 0 THEN
    RAISE NOTICE '✅✅✅ TOUT EST OK! ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Les triggers sont maintenant uniques.';
    RAISE NOTICE 'Aucun doublon dans la base.';
  ELSE
    IF v_insert_triggers > 1 OR v_update_triggers > 1 OR v_delete_triggers > 1 THEN
      RAISE NOTICE '⚠️ Il reste des triggers en double!';
    END IF;
    IF v_duplicates > 0 THEN
      RAISE NOTICE '⚠️ Il reste % doublons dans investor_investments', v_duplicates;
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES:';
  RAISE NOTICE '   1. Rafraîchir la page (F5)';
  RAISE NOTICE '   2. Aller dans Administration → Investisseur';
  RAISE NOTICE '   3. Vérifier l''historique (devrait être propre)';
  RAISE NOTICE '   4. Créer UN NOUVEAU test d''investissement';
  RAISE NOTICE '   5. Vérifier qu''il apparaît UNE SEULE fois';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Afficher les triggers restants
SELECT
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    ELSE 'Disabled'
  END as status
FROM pg_trigger
WHERE tgrelid = 'transactions'::regclass
  AND tgisinternal = false
  AND tgname LIKE '%investor_shares%'
ORDER BY tgname;
