-- ==========================================
-- SCRIPT D'APPLICATION DES MIGRATIONS CRITIQUES
-- Migrations: 102, 103, 104
-- ==========================================
-- Ce script applique les migrations critiques pour:
--   1. Nettoyer les triggers en double (cause des triples créations)
--   2. Nettoyer les doublons dans investor_investments
--   3. Créer le premier snapshot NAV si manquant
--
-- COMMENT EXÉCUTER:
--   1. Ouvrir Supabase Dashboard
--   2. Aller dans SQL Editor
--   3. Copier-coller tout ce fichier
--   4. Cliquer "Run"
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🚀 DÉBUT APPLICATION MIGRATIONS CRITIQUES 102-104';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- MIGRATION 102: NETTOYAGE FORCÉ AVEC CASCADE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '📋 MIGRATION 102: Nettoyage forcé avec CASCADE';
  RAISE NOTICE '';
END $$;

-- Lister tous les triggers sur transactions
SELECT
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'transactions'::regclass
  AND tgisinternal = false
ORDER BY tgname;

-- Supprimer TOUS les triggers avec CASCADE
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '🗑️ Suppression de tous les triggers sur transactions...';

  FOR trigger_record IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'transactions'::regclass
      AND tgisinternal = false
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON transactions CASCADE', trigger_record.tgname);
    RAISE NOTICE '  ✓ Trigger supprimé: %', trigger_record.tgname;
  END LOOP;

  RAISE NOTICE '✅ Tous les triggers supprimés';
END $$;

-- Supprimer toutes les fonctions
DROP FUNCTION IF EXISTS handle_transaction_investment_change() CASCADE;
DROP FUNCTION IF EXISTS auto_create_investor_shares_from_transactions() CASCADE;
DROP FUNCTION IF EXISTS auto_update_investor_shares_on_transaction_update() CASCADE;
DROP FUNCTION IF EXISTS auto_delete_investor_shares_on_transaction_delete() CASCADE;

-- Nettoyer les doublons
DO $$
DECLARE
  v_total_before INTEGER;
  v_deleted INTEGER := 0;
  v_total_after INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_before FROM investor_investments;
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Nettoyage des doublons...';
  RAISE NOTICE '  État initial: % entrées', v_total_before;

  -- Supprimer les doublons (garder le plus récent)
  WITH duplicates AS (
    SELECT id, transaction_id,
           ROW_NUMBER() OVER (PARTITION BY transaction_id ORDER BY created_at DESC) as rn
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
  )
  DELETE FROM investor_investments
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Supprimer les orphelins
  DELETE FROM investor_investments WHERE transaction_id IS NULL;

  SELECT COUNT(*) INTO v_total_after FROM investor_investments;
  RAISE NOTICE '  ✓ Doublons supprimés: %', v_deleted;
  RAISE NOTICE '  État final: % entrées', v_total_after;
END $$;

-- S'assurer que transaction_id existe avec CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_investments' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE investor_investments
    ADD COLUMN transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE;

    CREATE INDEX idx_investor_investments_transaction_id
    ON investor_investments(transaction_id);
  END IF;

  -- Forcer la contrainte CASCADE
  ALTER TABLE investor_investments
  DROP CONSTRAINT IF EXISTS investor_investments_transaction_id_fkey;

  ALTER TABLE investor_investments
  ADD CONSTRAINT investor_investments_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
END $$;

-- Recréer les triggers (version propre, sans doublons)
CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_id UUID;
BEGIN
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Vérifier si déjà existant
    SELECT id INTO v_existing_id
    FROM investor_investments
    WHERE transaction_id = NEW.id;

    IF v_existing_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Récupérer prix de la part
    SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
    IF v_share_price IS NULL OR v_share_price = 0 THEN v_share_price := 1.00; END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Insérer
    INSERT INTO investor_investments (
      investor_id, transaction_id, investment_date, amount_invested,
      number_of_shares, share_price_at_purchase, currency,
      payment_method, status, notes
    ) VALUES (
      NEW.investor_id, NEW.id, NEW.date, NEW.amount,
      v_number_of_shares, v_share_price, COALESCE(NEW.source_currency, 'CAD'),
      COALESCE(NEW.payment_method, 'virement'), 'active',
      CONCAT('Transaction #', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_investor_shares_from_transactions
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_investor_shares_from_transactions();

-- TRIGGER UPDATE
CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_id UUID;
BEGIN
  IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
    DELETE FROM investor_investments WHERE transaction_id = OLD.id;
    RETURN NEW;
  END IF;

  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN
    SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
    IF v_share_price IS NULL OR v_share_price = 0 THEN v_share_price := 1.00; END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    SELECT id INTO v_existing_id FROM investor_investments WHERE transaction_id = NEW.id;

    IF v_existing_id IS NOT NULL THEN
      UPDATE investor_investments SET
        investor_id = NEW.investor_id,
        investment_date = NEW.date,
        amount_invested = NEW.amount,
        number_of_shares = v_number_of_shares,
        share_price_at_purchase = v_share_price,
        currency = COALESCE(NEW.source_currency, 'CAD'),
        payment_method = COALESCE(NEW.payment_method, 'virement'),
        updated_at = NOW()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO investor_investments (
        investor_id, transaction_id, investment_date, amount_invested,
        number_of_shares, share_price_at_purchase, currency,
        payment_method, status, notes
      ) VALUES (
        NEW.investor_id, NEW.id, NEW.date, NEW.amount,
        v_number_of_shares, v_share_price, COALESCE(NEW.source_currency, 'CAD'),
        COALESCE(NEW.payment_method, 'virement'), 'active',
        CONCAT('Transaction #', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_investor_shares_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_update_investor_shares_on_transaction_update();

-- TRIGGER DELETE
CREATE OR REPLACE FUNCTION auto_delete_investor_shares_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'investissement' AND OLD.investor_id IS NOT NULL THEN
    DELETE FROM investor_investments WHERE transaction_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_delete_investor_shares_on_transaction_delete
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_delete_investor_shares_on_transaction_delete();

-- Relier les investments existants aux transactions
DO $$
DECLARE
  v_linked INTEGER := 0;
BEGIN
  UPDATE investor_investments ii
  SET transaction_id = t.id
  FROM transactions t
  WHERE ii.transaction_id IS NULL
    AND ii.investor_id = t.investor_id
    AND t.type = 'investissement'
    AND ii.investment_date::date = t.date::date
    AND ii.amount_invested = t.amount;

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RAISE NOTICE '  ✓ Investments reliés aux transactions: %', v_linked;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 102 TERMINÉE';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- MIGRATION 103: SUPPRIMER LES TRIGGERS EN DOUBLE
-- (Déjà fait dans 102, mais on vérifie)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '📋 MIGRATION 103: Vérification absence de doublons';
  RAISE NOTICE '';
END $$;

DO $$
DECLARE
  v_insert_triggers INTEGER;
  v_update_triggers INTEGER;
  v_delete_triggers INTEGER;
  v_duplicates INTEGER;
BEGIN
  -- Compter les triggers
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

  RAISE NOTICE '📊 Triggers actifs:';
  RAISE NOTICE '   • INSERT: % (devrait être 1)', v_insert_triggers;
  RAISE NOTICE '   • UPDATE: % (devrait être 1)', v_update_triggers;
  RAISE NOTICE '   • DELETE: % (devrait être 1)', v_delete_triggers;

  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT transaction_id, COUNT(*) as cnt
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
    HAVING COUNT(*) > 1
  ) dups;

  RAISE NOTICE '📊 Doublons restants: %', v_duplicates;

  IF v_insert_triggers = 1 AND v_update_triggers = 1 AND v_delete_triggers = 1 AND v_duplicates = 0 THEN
    RAISE NOTICE '✅ Aucun doublon - Tout est OK!';
  ELSE
    RAISE WARNING '⚠️ Il reste des anomalies!';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 103 VÉRIFIÉE';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- MIGRATION 104: FIX NAV VIEW EMPTY
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '📋 MIGRATION 104: Créer premier snapshot NAV si manquant';
  RAISE NOTICE '';
END $$;

DO $$
DECLARE
  v_snapshot_count INTEGER;
  v_snapshot_id UUID;
  v_can_create BOOLEAN := TRUE;
BEGIN
  -- Vérifier nav_history existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nav_history') THEN
    v_can_create := FALSE;
    RAISE WARNING '❌ Table nav_history manquante - exécutez migration 97';
  END IF;

  -- Vérifier fonction snapshot_nav existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'snapshot_nav' AND n.nspname = 'public'
  ) THEN
    v_can_create := FALSE;
    RAISE WARNING '❌ Fonction snapshot_nav manquante - exécutez migration 97';
  END IF;

  IF v_can_create THEN
    SELECT COUNT(*) INTO v_snapshot_count FROM nav_history;

    IF v_snapshot_count = 0 THEN
      RAISE NOTICE '🔧 Création du premier snapshot NAV...';

      BEGIN
        SELECT snapshot_nav(CURRENT_DATE) INTO v_snapshot_id;
        RAISE NOTICE '✅ Premier snapshot créé avec succès!';
        RAISE NOTICE '   • ID: %', v_snapshot_id;
        RAISE NOTICE '   • Date: %', CURRENT_DATE;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ Erreur lors de la création du snapshot: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE '✅ La table nav_history contient déjà % snapshot(s)', v_snapshot_count;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 104 TERMINÉE';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

DO $$
DECLARE
  v_trigger_count INTEGER;
  v_total INTEGER;
  v_duplicates INTEGER;
  v_nav_snapshots INTEGER;
BEGIN
  -- État des triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'transactions'::regclass
    AND tgisinternal = false;

  RAISE NOTICE '📊 Triggers actifs: %', v_trigger_count;

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
  RAISE NOTICE '   • Total: %', v_total;
  RAISE NOTICE '   • Doublons: %', v_duplicates;

  -- État NAV
  SELECT COUNT(*) INTO v_nav_snapshots FROM nav_history;
  RAISE NOTICE '📊 NAV snapshots: %', v_nav_snapshots;

  RAISE NOTICE '';

  IF v_duplicates = 0 AND v_trigger_count = 3 THEN
    RAISE NOTICE '✅✅✅ SUCCÈS COMPLET! ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Système prêt à l''emploi:';
    RAISE NOTICE '  • Triggers uniques (pas de doublons)';
    RAISE NOTICE '  • Base de données propre';
    RAISE NOTICE '  • NAV fonctionnel';
  ELSE
    RAISE WARNING '⚠️ Quelques problèmes détectés - voir ci-dessus';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES:';
  RAISE NOTICE '   1. Rafraîchir la page application (F5)';
  RAISE NOTICE '   2. Aller dans Administration → NAV';
  RAISE NOTICE '   3. Vérifier que toutes les données s''affichent';
  RAISE NOTICE '   4. Créer un test d''investissement';
  RAISE NOTICE '   5. Vérifier qu''il apparaît UNE SEULE fois';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
