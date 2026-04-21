-- ==========================================
-- NETTOYAGE FORCÉ AVEC CASCADE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSTIC - Triggers actuels sur transactions';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Lister tous les triggers sur transactions
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'transactions'::regclass
  AND tgisinternal = false
ORDER BY tgname;

-- ==========================================
-- ÉTAPE 1: SUPPRIMER TOUS LES TRIGGERS AVEC FORCE
-- ==========================================

DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🗑️ SUPPRESSION FORCÉE DE TOUS LES TRIGGERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Supprimer tous les triggers sur la table transactions
  FOR trigger_record IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'transactions'::regclass
      AND tgisinternal = false
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON transactions CASCADE', trigger_record.tgname);
    RAISE NOTICE '  ✓ Trigger supprimé: %', trigger_record.tgname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Tous les triggers supprimés';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 2: SUPPRIMER TOUTES LES FONCTIONS
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🗑️ SUPPRESSION DES FONCTIONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

DROP FUNCTION IF EXISTS handle_transaction_investment_change() CASCADE;
DROP FUNCTION IF EXISTS auto_create_investor_shares_from_transactions() CASCADE;
DROP FUNCTION IF EXISTS auto_update_investor_shares_on_transaction_update() CASCADE;
DROP FUNCTION IF EXISTS auto_delete_investor_shares_on_transaction_delete() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Toutes les fonctions supprimées';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 3: NETTOYER LES DOUBLONS
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
  RAISE NOTICE '';

  -- Supprimer les doublons (garder le plus récent par transaction_id)
  WITH duplicates AS (
    SELECT id, transaction_id,
           ROW_NUMBER() OVER (PARTITION BY transaction_id ORDER BY created_at DESC) as rn
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
  )
  DELETE FROM investor_investments
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '  ✓ Doublons supprimés (par transaction_id): %', v_deleted;

  -- Supprimer les entrées orphelines (sans transaction_id)
  DELETE FROM investor_investments
  WHERE transaction_id IS NULL;

  GET DIAGNOSTICS v_orphaned = ROW_COUNT;
  RAISE NOTICE '  ✓ Entrées orphelines supprimées (sans transaction_id): %', v_orphaned;

  SELECT COUNT(*) INTO v_total_after FROM investor_investments;
  RAISE NOTICE '';
  RAISE NOTICE '  État final: % entrées (supprimé: %)', v_total_after, v_total_before - v_total_after;
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 4: S'ASSURER QUE LA COLONNE transaction_id EXISTE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 VÉRIFICATION COLONNE transaction_id';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_investments' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE investor_investments
    ADD COLUMN transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE;

    CREATE INDEX idx_investor_investments_transaction_id
    ON investor_investments(transaction_id);

    RAISE NOTICE '  ✓ Colonne transaction_id créée';
  ELSE
    RAISE NOTICE '  ✓ Colonne transaction_id existe';
  END IF;

  -- Vérifier la contrainte ON DELETE CASCADE
  ALTER TABLE investor_investments
  DROP CONSTRAINT IF EXISTS investor_investments_transaction_id_fkey;

  ALTER TABLE investor_investments
  ADD CONSTRAINT investor_investments_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;

  RAISE NOTICE '  ✓ Contrainte CASCADE configurée';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 5: RECRÉER LES TRIGGERS
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 RECRÉATION DES TRIGGERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- TRIGGER INSERT
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
      RAISE NOTICE '⚠️ Investment existe déjà pour transaction %', NEW.id;
      RETURN NEW;
    END IF;

    -- Récupérer prix de la part
    SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
    IF v_share_price IS NULL OR v_share_price = 0 THEN v_share_price := 1.00; END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Insérer UNE SEULE FOIS
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

    RAISE NOTICE '✅ Parts créées: % parts (transaction %)', v_number_of_shares, NEW.id;
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
  -- Cas 1: N'est plus un investissement
  IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
    DELETE FROM investor_investments WHERE transaction_id = OLD.id;
    RAISE NOTICE '🗑️ Parts supprimées (plus un investissement)';
    RETURN NEW;
  END IF;

  -- Cas 2: Est (ou devient) un investissement
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN
    SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
    IF v_share_price IS NULL OR v_share_price = 0 THEN v_share_price := 1.00; END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Chercher l'existant
    SELECT id INTO v_existing_id FROM investor_investments WHERE transaction_id = NEW.id;

    IF v_existing_id IS NOT NULL THEN
      -- UPDATE
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

      RAISE NOTICE '✅ Parts mises à jour: %', v_number_of_shares;
    ELSE
      -- INSERT (devient investissement)
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

      RAISE NOTICE '✅ Parts créées lors UPDATE: %', v_number_of_shares;
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
    RAISE NOTICE '🗑️ Parts supprimées (transaction supprimée)';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_delete_investor_shares_on_transaction_delete
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_delete_investor_shares_on_transaction_delete();

DO $$
BEGIN
  RAISE NOTICE '  ✓ auto_create_investor_shares_from_transactions (INSERT)';
  RAISE NOTICE '  ✓ auto_update_investor_shares_on_transaction_update (UPDATE)';
  RAISE NOTICE '  ✓ auto_delete_investor_shares_on_transaction_delete (DELETE)';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 6: RELIER LES INVESTMENTS AUX TRANSACTIONS
-- ==========================================

DO $$
DECLARE
  v_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔗 LIAISON DES INVESTMENTS EXISTANTS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Relier par matching: investor_id + date + montant
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
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 7: VÉRIFICATION FINALE
-- ==========================================

DO $$
DECLARE
  v_total INTEGER;
  v_with_transaction_id INTEGER;
  v_without_transaction_id INTEGER;
  v_duplicates INTEGER;
  v_trigger_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Compter les triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'transactions'::regclass
    AND tgisinternal = false;

  RAISE NOTICE '📊 Triggers actifs: %', v_trigger_count;
  RAISE NOTICE '';

  -- État de investor_investments
  SELECT COUNT(*) INTO v_total FROM investor_investments;
  SELECT COUNT(*) INTO v_with_transaction_id FROM investor_investments WHERE transaction_id IS NOT NULL;
  SELECT COUNT(*) INTO v_without_transaction_id FROM investor_investments WHERE transaction_id IS NULL;

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
  RAISE NOTICE '   • Avec transaction_id: %', v_with_transaction_id;
  RAISE NOTICE '   • Sans transaction_id: %', v_without_transaction_id;
  RAISE NOTICE '   • Doublons: %', v_duplicates;
  RAISE NOTICE '';

  IF v_duplicates = 0 THEN
    RAISE NOTICE '✅ AUCUN DOUBLON - Tout est OK!';
  ELSE
    RAISE NOTICE '⚠️ Il reste % doublons', v_duplicates;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 PROCHAINE ÉTAPE:';
  RAISE NOTICE '   1. Rafraîchir la page (F5)';
  RAISE NOTICE '   2. Tester création d''un investissement';
  RAISE NOTICE '   3. Vérifier qu''il apparaît UNE SEULE fois';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
