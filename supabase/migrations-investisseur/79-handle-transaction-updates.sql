-- ==========================================
-- MIGRATION 79: GÉRER LES MODIFICATIONS DE TRANSACTIONS
-- Mise à jour automatique des parts d'investisseur lors de modifications
-- ==========================================

-- Problème actuel:
-- Quand on modifie une transaction d'investissement (changement de montant, date, etc.),
-- les parts dans investor_investments ne sont pas mises à jour
-- Cela crée une incohérence entre transactions et investor_investments

-- Solution:
-- Créer un trigger qui met à jour ou supprime/recrée les parts lors d'un UPDATE

-- 1. Fonction pour gérer les modifications de transactions
CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_old_investment_exists BOOLEAN;
BEGIN
  -- Seulement pour les transactions de type 'investissement'

  -- CAS 1: L'ancienne transaction était un investissement mais plus maintenant
  IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
    DELETE FROM investor_investments
    WHERE investor_id = OLD.investor_id
      AND investment_date = OLD.date
      AND amount_invested = OLD.amount;

    RAISE NOTICE 'Parts supprimées (transaction n''est plus un investissement): transaction %', NEW.id;
    RETURN NEW;
  END IF;

  -- CAS 2: La nouvelle transaction est un investissement
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Récupérer le prix actuel de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    -- Calculer le nouveau nombre de parts
    v_number_of_shares := NEW.amount / v_share_price;

    -- Vérifier si un enregistrement existe pour l'ancienne transaction
    SELECT EXISTS (
      SELECT 1 FROM investor_investments
      WHERE investor_id = OLD.investor_id
        AND investment_date = OLD.date
        AND amount_invested = OLD.amount
    ) INTO v_old_investment_exists;

    IF v_old_investment_exists THEN
      -- Mettre à jour l'enregistrement existant
      UPDATE investor_investments
      SET
        investor_id = NEW.investor_id,
        investment_date = NEW.date,
        amount_invested = NEW.amount,
        share_price_at_purchase = v_share_price,
        number_of_shares = v_number_of_shares,
        currency = COALESCE(NEW.source_currency, 'CAD'),
        payment_method = NEW.payment_method,
        reference_number = NEW.reference_number,
        notes = CONCAT('Transaction #', NEW.id, ' - ', NEW.description, ' (modifiée)'),
        updated_at = NOW()
      WHERE investor_id = OLD.investor_id
        AND investment_date = OLD.date
        AND amount_invested = OLD.amount;

      RAISE NOTICE 'Parts mises à jour: % parts pour investisseur % (montant: % CAD)',
        v_number_of_shares, NEW.investor_id, NEW.amount;
    ELSE
      -- Créer un nouvel enregistrement (cas où l'ancienne transaction n'était pas un investissement)
      INSERT INTO investor_investments (
        investor_id,
        investment_date,
        amount_invested,
        share_price_at_purchase,
        number_of_shares,
        currency,
        payment_method,
        reference_number,
        notes
      ) VALUES (
        NEW.investor_id,
        NEW.date,
        NEW.amount,
        v_share_price,
        v_number_of_shares,
        COALESCE(NEW.source_currency, 'CAD'),
        NEW.payment_method,
        NEW.reference_number,
        CONCAT('Transaction #', NEW.id, ' - ', NEW.description, ' (créée par modification)')
      )
      ON CONFLICT DO NOTHING;

      RAISE NOTICE 'Parts créées lors de la modification: % parts pour investisseur %',
        v_number_of_shares, NEW.investor_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_update_investor_shares_on_transaction_update IS
  'Met à jour automatiquement les parts d''investisseur quand une transaction d''investissement est modifiée';

-- 2. Créer le trigger sur UPDATE
DROP TRIGGER IF EXISTS auto_update_investor_shares ON transactions;

CREATE TRIGGER auto_update_investor_shares
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_update_investor_shares_on_transaction_update();

COMMENT ON TRIGGER auto_update_investor_shares ON transactions IS
  'Synchronise automatiquement les modifications de transactions d''investissement avec investor_investments';

-- 3. Améliorer le trigger de création (migration 77) pour éviter les doublons
-- Recréer la fonction avec vérification de doublons
CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_exists BOOLEAN;
BEGIN
  -- Seulement pour les transactions de type 'investissement' avec un investor_id
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Vérifier si des parts existent déjà pour cette transaction
    SELECT EXISTS (
      SELECT 1 FROM investor_investments
      WHERE investor_id = NEW.investor_id
        AND investment_date = NEW.date
        AND amount_invested = NEW.amount
    ) INTO v_exists;

    -- Ne rien faire si des parts existent déjà
    IF v_exists THEN
      RAISE NOTICE 'Parts déjà existantes pour transaction % - création ignorée', NEW.id;
      RETURN NEW;
    END IF;

    -- Récupérer le prix actuel de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    -- Calculer le nombre de parts
    v_number_of_shares := NEW.amount / v_share_price;

    -- Insérer dans investor_investments
    INSERT INTO investor_investments (
      investor_id,
      investment_date,
      amount_invested,
      share_price_at_purchase,
      number_of_shares,
      currency,
      payment_method,
      reference_number,
      notes
    ) VALUES (
      NEW.investor_id,
      NEW.date,
      NEW.amount,
      v_share_price,
      v_number_of_shares,
      COALESCE(NEW.source_currency, 'CAD'),
      NEW.payment_method,
      NEW.reference_number,
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Parts créées: % parts pour investisseur % (montant: % CAD, prix part: %)',
      v_number_of_shares, NEW.investor_id, NEW.amount, v_share_price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'auto_update_investor_shares'
  ) THEN
    RAISE NOTICE '✅ Trigger auto_update_investor_shares créé avec succès';
    RAISE NOTICE 'ℹ️ Les modifications de transactions d''investissement mettront à jour les parts automatiquement';
  ELSE
    RAISE WARNING '⚠️ Échec de création du trigger';
  END IF;
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 79 TERMINÉE' as status,
  'Trigger auto_update_investor_shares créé - Les modifications de transactions mettent à jour les parts' as message;
