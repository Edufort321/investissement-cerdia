-- ==========================================
-- MIGRATION 100: CORRIGER TRIGGERS EN TRIPLE
-- ==========================================
--
-- PROBLÈME: Les investissements sont créés 3 fois dans investor_investments
--           Car il y a plusieurs triggers actifs qui se chevauchent:
--           1. auto_create_investor_shares_from_transactions (INSERT) - migration 90
--           2. auto_update_investor_shares_on_transaction_update (UPDATE) - migration 90
--           3. handle_transaction_investment_change (UPDATE) - migration 89
--
-- SOLUTION:
--   1. Supprimer TOUS les anciens triggers
--   2. Recréer UNIQUEMENT ceux de migration 90-FINAL
--   3. Nettoyer les doublons existants
--
-- ==========================================

-- ÉTAPE 1: SUPPRIMER TOUS LES ANCIENS TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS handle_transaction_investment_change ON transactions;
DROP TRIGGER IF EXISTS auto_create_investor_shares_from_transactions ON transactions;
DROP TRIGGER IF EXISTS auto_update_investor_shares_on_transaction_update ON transactions;
DROP TRIGGER IF EXISTS auto_delete_investor_shares_on_transaction_delete ON transactions;

DROP FUNCTION IF EXISTS handle_transaction_investment_change();

-- ==========================================
-- ÉTAPE 2: RECRÉER LES FONCTIONS ET TRIGGERS (migration 90-FINAL)
-- ==========================================

-- Trigger INSERT: Créer les parts lors de la création d'une transaction investissement
CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_id UUID;
BEGIN
  -- Seulement pour les transactions d'investissement avec investisseur
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Récupérer le prix de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    -- Valeur par défaut
    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    -- Calculer le nombre de parts
    v_number_of_shares := NEW.amount / v_share_price;

    -- Vérifier si une entrée existe déjà pour cette transaction
    SELECT id INTO v_existing_id
    FROM investor_investments
    WHERE transaction_id = NEW.id
    LIMIT 1;

    -- Seulement insérer si pas déjà existant
    IF v_existing_id IS NULL THEN
      INSERT INTO investor_investments (
        investor_id,
        transaction_id,
        investment_date,
        amount_invested,
        number_of_shares,
        share_price_at_purchase,
        currency,
        payment_method,
        status,
        notes
      ) VALUES (
        NEW.investor_id,
        NEW.id,
        NEW.date,
        NEW.amount,
        v_number_of_shares,
        v_share_price,
        COALESCE(NEW.source_currency, 'CAD'),
        COALESCE(NEW.payment_method, 'virement'),
        'active',
        CONCAT('Transaction #', NEW.id, ' - ', COALESCE(NEW.description, 'Investissement'))
      );

      RAISE NOTICE '✅ Parts créées: % parts pour investisseur %', v_number_of_shares, NEW.investor_id;
    ELSE
      RAISE NOTICE '⚠️ Parts déjà existantes pour transaction %, skip', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_investor_shares_from_transactions
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_investor_shares_from_transactions();

-- Trigger UPDATE: Mettre à jour les parts lors de la modification d'une transaction
CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_investment_id UUID;
BEGIN
  -- Cas 1: Transaction n'est plus un investissement -> Supprimer
  IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
    DELETE FROM investor_investments WHERE transaction_id = OLD.id;
    RAISE NOTICE '🗑️ Parts supprimées (transaction n''est plus un investissement)';
    RETURN NEW;
  END IF;

  -- Cas 2: Transaction est (ou devient) un investissement -> Créer ou Mettre à jour
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Récupérer le prix de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Chercher l'investissement lié à cette transaction
    SELECT id INTO v_existing_investment_id
    FROM investor_investments
    WHERE transaction_id = NEW.id
    LIMIT 1;

    IF v_existing_investment_id IS NOT NULL THEN
      -- Mettre à jour l'existant
      UPDATE investor_investments SET
        investor_id = NEW.investor_id,
        investment_date = NEW.date,
        amount_invested = NEW.amount,
        number_of_shares = v_number_of_shares,
        share_price_at_purchase = v_share_price,
        currency = COALESCE(NEW.source_currency, 'CAD'),
        payment_method = COALESCE(NEW.payment_method, 'virement'),
        notes = CONCAT('Transaction #', NEW.id, ' - ', COALESCE(NEW.description, 'Investissement (modifié)')),
        updated_at = NOW()
      WHERE id = v_existing_investment_id;

      RAISE NOTICE '✅ Parts mises à jour: % parts', v_number_of_shares;
    ELSE
      -- Créer si n'existe pas (cas où transaction devient investissement)
      INSERT INTO investor_investments (
        investor_id,
        transaction_id,
        investment_date,
        amount_invested,
        number_of_shares,
        share_price_at_purchase,
        currency,
        payment_method,
        status,
        notes
      ) VALUES (
        NEW.investor_id,
        NEW.id,
        NEW.date,
        NEW.amount,
        v_number_of_shares,
        v_share_price,
        COALESCE(NEW.source_currency, 'CAD'),
        COALESCE(NEW.payment_method, 'virement'),
        'active',
        CONCAT('Transaction #', NEW.id, ' - ', COALESCE(NEW.description, 'Investissement (créé lors modification)'))
      );

      RAISE NOTICE '✅ Parts créées suite à modification: % parts', v_number_of_shares;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_investor_shares_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_update_investor_shares_on_transaction_update();

-- Trigger DELETE: Supprimer les parts lors de la suppression d'une transaction
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

-- ==========================================
-- ÉTAPE 3: NETTOYER LES DOUBLONS EXISTANTS
-- ==========================================

-- Supprimer les entrées en double (garder la plus récente pour chaque transaction)
DO $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Pour chaque transaction, garder seulement l'entrée la plus récente
  WITH duplicates AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY transaction_id
        ORDER BY created_at DESC
      ) as rn
    FROM investor_investments
    WHERE transaction_id IS NOT NULL
  )
  DELETE FROM investor_investments
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE '🧹 Doublons supprimés: % entrées', v_deleted_count;

  -- Supprimer les entrées orphelines (sans transaction_id et créées récemment)
  DELETE FROM investor_investments
  WHERE transaction_id IS NULL
    AND notes LIKE '%Créé lors MAJ%'
    AND created_at > NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '🧹 Entrées orphelines supprimées: % entrées', v_deleted_count;
END $$;

-- ==========================================
-- MESSAGE DE SUCCÈS
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 100 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Triggers nettoyés et recréés:';
  RAISE NOTICE '   • auto_create_investor_shares_from_transactions (INSERT)';
  RAISE NOTICE '   • auto_update_investor_shares_on_transaction_update (UPDATE)';
  RAISE NOTICE '   • auto_delete_investor_shares_on_transaction_delete (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Doublons nettoyés dans investor_investments';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Les nouveaux investissements seront créés UNE SEULE FOIS';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
