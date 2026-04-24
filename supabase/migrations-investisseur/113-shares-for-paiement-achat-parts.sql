-- Migration 113: Parts pour type='paiement' + investor_payment_type='achat_parts'
--
-- PROBLÈME : Les triggers auto_create/update_investor_shares ne traitent que
--            type='investissement'. Les paiements directs en parts (type='paiement'
--            + investor_payment_type='achat_parts') ne créaient aucune entrée
--            dans investor_investments.
--
-- SOLUTION :
--   1. Mettre à jour le trigger INSERT pour couvrir les deux cas
--   2. Mettre à jour le trigger UPDATE de même
--   3. Backfiller les transactions existantes sans parts

-- ─── Helpers ────────────────────────────────────────────────────────────────

-- Renvoie TRUE si la transaction doit générer des parts
CREATE OR REPLACE FUNCTION tx_should_generate_shares(
  p_type TEXT,
  p_investor_payment_type TEXT,
  p_investor_id UUID
) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT p_investor_id IS NOT NULL AND (
    p_type = 'investissement'
    OR (p_type = 'paiement' AND p_investor_payment_type = 'achat_parts')
  );
$$;

-- ─── Trigger INSERT ──────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS auto_create_investor_shares ON transactions;

CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price      DECIMAL(10,4);
  v_number_of_shares DECIMAL(15,4);
BEGIN
  IF NOT tx_should_generate_shares(NEW.type, NEW.investor_payment_type, NEW.investor_id) THEN
    RETURN NEW;
  END IF;

  -- Vérifier qu'il n'existe pas déjà (idempotent)
  IF EXISTS (SELECT 1 FROM investor_investments WHERE transaction_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
  IF v_share_price IS NULL OR v_share_price <= 0 THEN v_share_price := 1.00; END IF;

  v_number_of_shares := ABS(NEW.amount) / v_share_price;

  INSERT INTO investor_investments (
    investor_id, transaction_id, investment_date, amount_invested,
    number_of_shares, share_price_at_purchase, currency,
    payment_method, status, notes
  ) VALUES (
    NEW.investor_id, NEW.id, NEW.date, ABS(NEW.amount),
    v_number_of_shares, v_share_price,
    COALESCE(NEW.source_currency, 'CAD'),
    COALESCE(NEW.payment_method, 'virement'), 'active',
    CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
  );

  RAISE NOTICE '✅ Parts créées (INSERT): % parts pour investisseur % (tx_type: %)',
    v_number_of_shares, NEW.investor_id, NEW.type;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_investor_shares
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_investor_shares_from_transaction();

-- ─── Trigger UPDATE ──────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS auto_update_investor_shares_on_transaction_update ON transactions;

CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price      DECIMAL(10,4);
  v_number_of_shares DECIMAL(15,4);
  v_existing_id      UUID;
BEGIN
  -- Si la transaction ne doit plus générer de parts → supprimer
  IF NOT tx_should_generate_shares(NEW.type, NEW.investor_payment_type, NEW.investor_id) THEN
    IF tx_should_generate_shares(OLD.type, OLD.investor_payment_type, OLD.investor_id) THEN
      DELETE FROM investor_investments WHERE transaction_id = OLD.id;
      RAISE NOTICE '🗑️ Parts supprimées (plus eligible)';
    END IF;
    RETURN NEW;
  END IF;

  SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
  IF v_share_price IS NULL OR v_share_price <= 0 THEN v_share_price := 1.00; END IF;

  v_number_of_shares := ABS(NEW.amount) / v_share_price;

  SELECT id INTO v_existing_id FROM investor_investments WHERE transaction_id = NEW.id;

  IF v_existing_id IS NOT NULL THEN
    UPDATE investor_investments SET
      investor_id            = NEW.investor_id,
      investment_date        = NEW.date,
      amount_invested        = ABS(NEW.amount),
      number_of_shares       = v_number_of_shares,
      share_price_at_purchase = v_share_price,
      currency               = COALESCE(NEW.source_currency, 'CAD'),
      updated_at             = NOW()
    WHERE id = v_existing_id;

    RAISE NOTICE '✅ Parts mises à jour (UPDATE): %', v_number_of_shares;
  ELSE
    INSERT INTO investor_investments (
      investor_id, transaction_id, investment_date, amount_invested,
      number_of_shares, share_price_at_purchase, currency,
      payment_method, status, notes
    ) VALUES (
      NEW.investor_id, NEW.id, NEW.date, ABS(NEW.amount),
      v_number_of_shares, v_share_price,
      COALESCE(NEW.source_currency, 'CAD'),
      COALESCE(NEW.payment_method, 'virement'), 'active',
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
    );

    RAISE NOTICE '✅ Parts créées (UPDATE→INSERT): % parts', v_number_of_shares;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_investor_shares_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_update_investor_shares_on_transaction_update();

-- ─── Trigger DELETE ──────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS auto_delete_investor_shares_on_transaction_delete ON transactions;

CREATE OR REPLACE FUNCTION auto_delete_investor_shares_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF tx_should_generate_shares(OLD.type, OLD.investor_payment_type, OLD.investor_id) THEN
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

-- ─── Backfill des transactions existantes ────────────────────────────────────

DO $$
DECLARE
  v_share_price DECIMAL(10,4);
  v_count       INTEGER := 0;
  r             RECORD;
BEGIN
  SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
  IF v_share_price IS NULL OR v_share_price <= 0 THEN v_share_price := 1.00; END IF;

  FOR r IN
    SELECT t.id, t.investor_id, t.date, t.amount, t.source_currency,
           t.description, t.payment_method
    FROM transactions t
    WHERE tx_should_generate_shares(t.type, t.investor_payment_type, t.investor_id)
      AND t.status != 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM investor_investments ii WHERE ii.transaction_id = t.id
      )
  LOOP
    INSERT INTO investor_investments (
      investor_id, transaction_id, investment_date, amount_invested,
      number_of_shares, share_price_at_purchase, currency,
      payment_method, status, notes
    ) VALUES (
      r.investor_id, r.id, r.date, ABS(r.amount),
      ABS(r.amount) / v_share_price, v_share_price,
      COALESCE(r.source_currency, 'CAD'),
      COALESCE(r.payment_method, 'virement'), 'active',
      CONCAT('Backfill migration 113 - ', r.description)
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 113 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 Parts backfillées : %', v_count;
  RAISE NOTICE '💡 Triggers mis à jour pour paiement+achat_parts';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
