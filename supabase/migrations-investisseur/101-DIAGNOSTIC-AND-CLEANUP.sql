-- ==========================================
-- DIAGNOSTIC ET NETTOYAGE COMPLET
-- ==========================================

-- ==========================================
-- ÉTAPE 1: DIAGNOSTIC - Voir les triggers actifs
-- ==========================================

DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSTIC DES TRIGGERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  FOR trigger_record IN
    SELECT tgname, tgtype, tgenabled
    FROM pg_trigger
    WHERE tgrelid = 'transactions'::regclass
      AND tgname LIKE '%investor%' OR tgname LIKE '%transaction%'
  LOOP
    RAISE NOTICE '  Trigger: % | Enabled: %', trigger_record.tgname, trigger_record.tgenabled;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 2: DIAGNOSTIC - Voir les doublons actuels
-- ==========================================

DO $$
DECLARE
  v_total INTEGER;
  v_with_transaction_id INTEGER;
  v_without_transaction_id INTEGER;
  v_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM investor_investments;

  SELECT COUNT(*) INTO v_with_transaction_id
  FROM investor_investments
  WHERE transaction_id IS NOT NULL;

  SELECT COUNT(*) INTO v_without_transaction_id
  FROM investor_investments
  WHERE transaction_id IS NULL;

  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT transaction_id, COUNT(*) as cnt
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
    HAVING COUNT(*) > 1
  ) duplicates;

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 ÉTAT DE investor_investments';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '  Total entrées: %', v_total;
  RAISE NOTICE '  Avec transaction_id: %', v_with_transaction_id;
  RAISE NOTICE '  Sans transaction_id: %', v_without_transaction_id;
  RAISE NOTICE '  Transactions dupliquées: %', v_duplicates;
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 3: SUPPRIMER TOUS LES TRIGGERS
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🗑️ SUPPRESSION DE TOUS LES TRIGGERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

DROP TRIGGER IF EXISTS handle_transaction_investment_change ON transactions;
DROP TRIGGER IF EXISTS auto_create_investor_shares_from_transactions ON transactions;
DROP TRIGGER IF EXISTS auto_update_investor_shares_on_transaction_update ON transactions;
DROP TRIGGER IF EXISTS auto_delete_investor_shares_on_transaction_delete ON transactions;

DROP FUNCTION IF EXISTS handle_transaction_investment_change();
DROP FUNCTION IF EXISTS auto_create_investor_shares_from_transactions();
DROP FUNCTION IF EXISTS auto_update_investor_shares_on_transaction_update();
DROP FUNCTION IF EXISTS auto_delete_investor_shares_on_transaction_delete();

DO $$
BEGIN
  RAISE NOTICE '✅ Tous les triggers supprimés';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 4: NETTOYER LES DOUBLONS
-- ==========================================

DO $$
DECLARE
  v_deleted INTEGER := 0;
  v_orphaned INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🧹 NETTOYAGE DES DOUBLONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Supprimer les doublons en gardant le plus récent pour chaque transaction
  DELETE FROM investor_investments
  WHERE id IN (
    SELECT ii.id
    FROM investor_investments ii
    INNER JOIN (
      SELECT transaction_id, MAX(created_at) as max_created
      FROM investor_investments
      WHERE transaction_id IS NOT NULL
      GROUP BY transaction_id
      HAVING COUNT(*) > 1
    ) dups ON ii.transaction_id = dups.transaction_id
    WHERE ii.created_at < dups.max_created
  );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '  Doublons supprimés: %', v_deleted;

  -- Supprimer les entrées orphelines (sans transaction_id)
  DELETE FROM investor_investments
  WHERE transaction_id IS NULL
    AND (
      notes LIKE '%Créé lors MAJ%'
      OR notes LIKE '%Achat de%part%'
      OR notes = 'Créé automatiquement'
    );

  GET DIAGNOSTICS v_orphaned = ROW_COUNT;
  RAISE NOTICE '  Entrées orphelines supprimées: %', v_orphaned;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total nettoyé: % entrées', v_deleted + v_orphaned;
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 5: VÉRIFIER/CRÉER COLONNE transaction_id
-- ==========================================

DO $$
BEGIN
  -- S'assurer que la colonne transaction_id existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_investments' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE investor_investments
    ADD COLUMN transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE;

    CREATE INDEX idx_investor_investments_transaction_id
    ON investor_investments(transaction_id);

    RAISE NOTICE '✅ Colonne transaction_id créée';
  ELSE
    RAISE NOTICE '✅ Colonne transaction_id existe déjà';
  END IF;
END $$;

-- ==========================================
-- ÉTAPE 6: RECRÉER LES TRIGGERS
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 RECRÉATION DES TRIGGERS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- FONCTION INSERT
CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_id UUID;
BEGIN
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Vérifier si déjà existant par transaction_id
    SELECT id INTO v_existing_id
    FROM investor_investments
    WHERE transaction_id = NEW.id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE NOTICE '⚠️ Investment déjà existant pour transaction %, skip', NEW.id;
      RETURN NEW;
    END IF;

    -- Récupérer le prix de la part
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

    RAISE NOTICE '✅ Parts créées: % parts pour transaction %', v_number_of_shares, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_investor_shares_from_transactions
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_investor_shares_from_transactions();

-- FONCTION UPDATE
CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_investment_id UUID;
BEGIN
  -- Cas 1: N'est plus un investissement -> Supprimer
  IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
    DELETE FROM investor_investments WHERE transaction_id = OLD.id;
    RAISE NOTICE '🗑️ Parts supprimées (plus un investissement)';
    RETURN NEW;
  END IF;

  -- Cas 2: Est un investissement -> Créer ou Mettre à jour
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN
    SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
    IF v_share_price IS NULL OR v_share_price = 0 THEN v_share_price := 1.00; END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Chercher par transaction_id
    SELECT id INTO v_existing_investment_id
    FROM investor_investments
    WHERE transaction_id = NEW.id
    LIMIT 1;

    IF v_existing_investment_id IS NOT NULL THEN
      -- Mettre à jour
      UPDATE investor_investments SET
        investor_id = NEW.investor_id,
        investment_date = NEW.date,
        amount_invested = NEW.amount,
        number_of_shares = v_number_of_shares,
        share_price_at_purchase = v_share_price,
        currency = COALESCE(NEW.source_currency, 'CAD'),
        payment_method = COALESCE(NEW.payment_method, 'virement'),
        updated_at = NOW()
      WHERE id = v_existing_investment_id;

      RAISE NOTICE '✅ Parts mises à jour: %', v_number_of_shares;
    ELSE
      -- Créer
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

-- FONCTION DELETE
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
  RAISE NOTICE '✅ Triggers recréés:';
  RAISE NOTICE '   • auto_create_investor_shares_from_transactions';
  RAISE NOTICE '   • auto_update_investor_shares_on_transaction_update';
  RAISE NOTICE '   • auto_delete_investor_shares_on_transaction_delete';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- ÉTAPE 7: RELIER LES INVESTMENTS EXISTANTS AUX TRANSACTIONS
-- ==========================================

DO $$
DECLARE
  v_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔗 LIAISON DES INVESTMENTS AUX TRANSACTIONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Pour les investments sans transaction_id, essayer de trouver la transaction
  UPDATE investor_investments ii
  SET transaction_id = t.id
  FROM transactions t
  WHERE ii.transaction_id IS NULL
    AND ii.investor_id = t.investor_id
    AND t.type = 'investissement'
    AND ii.investment_date::date = t.date::date
    AND ii.amount_invested = t.amount;

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RAISE NOTICE '  Investments reliés: %', v_linked;
  RAISE NOTICE '';
END $$;

-- ==========================================
-- MESSAGE FINAL
-- ==========================================

DO $$
DECLARE
  v_final_count INTEGER;
  v_final_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_final_count FROM investor_investments;

  SELECT COUNT(*) INTO v_final_duplicates
  FROM (
    SELECT transaction_id, COUNT(*) as cnt
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
    HAVING COUNT(*) > 1
  ) dups;

  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ NETTOYAGE TERMINÉ';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 État final:';
  RAISE NOTICE '   • Total entries: %', v_final_count;
  RAISE NOTICE '   • Duplicates restants: %', v_final_duplicates;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaine étape:';
  RAISE NOTICE '   Rafraîchir la page et tester création d''investissement';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
