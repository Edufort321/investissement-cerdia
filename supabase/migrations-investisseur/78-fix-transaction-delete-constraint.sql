-- ==========================================
-- MIGRATION 78: CORRIGER CONTRAINTE DE SUPPRESSION TRANSACTIONS
-- Permet la suppression de transactions sans erreur de clé étrangère
-- ==========================================

-- Problème actuel:
-- Erreur lors de la suppression d'une transaction:
-- "update or delete on table transactions violates foreign key constraint
--  cash_flow_forecast_actual_transaction_id_fkey on table cash_flow_forecast"

-- Cause:
-- Le trigger create_actual_cash_flow insère automatiquement un enregistrement
-- dans cash_flow_forecast avec actual_transaction_id pointant vers la transaction.
-- La contrainte par défaut empêche la suppression.

-- Solution:
-- Modifier la contrainte pour ON DELETE SET NULL
-- Quand une transaction est supprimée, on met juste actual_transaction_id à NULL
-- dans cash_flow_forecast (on garde l'historique des prévisions)

-- 1. Corriger contrainte sur cash_flow_forecast
ALTER TABLE cash_flow_forecast
DROP CONSTRAINT IF EXISTS cash_flow_forecast_actual_transaction_id_fkey;

ALTER TABLE cash_flow_forecast
ADD CONSTRAINT cash_flow_forecast_actual_transaction_id_fkey
FOREIGN KEY (actual_transaction_id)
REFERENCES transactions(id)
ON DELETE SET NULL;

COMMENT ON CONSTRAINT cash_flow_forecast_actual_transaction_id_fkey ON cash_flow_forecast IS
  'Référence à la transaction réelle. Si la transaction est supprimée, actual_transaction_id est mis à NULL mais la prévision est conservée.';

-- 2. Corriger contrainte sur bank_transactions (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_transactions') THEN
    ALTER TABLE bank_transactions
    DROP CONSTRAINT IF EXISTS bank_transactions_matched_transaction_id_fkey;

    ALTER TABLE bank_transactions
    ADD CONSTRAINT bank_transactions_matched_transaction_id_fkey
    FOREIGN KEY (matched_transaction_id)
    REFERENCES transactions(id)
    ON DELETE SET NULL;

    RAISE NOTICE '✅ Contrainte bank_transactions.matched_transaction_id mise à jour';
  END IF;
END $$;

-- 3. Corriger contrainte sur payment_obligations (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_obligations') THEN
    ALTER TABLE payment_obligations
    DROP CONSTRAINT IF EXISTS payment_obligations_paid_transaction_id_fkey;

    ALTER TABLE payment_obligations
    ADD CONSTRAINT payment_obligations_paid_transaction_id_fkey
    FOREIGN KEY (paid_transaction_id)
    REFERENCES transactions(id)
    ON DELETE SET NULL;

    RAISE NOTICE '✅ Contrainte payment_obligations.paid_transaction_id mise à jour';
  END IF;
END $$;

-- Vérification
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  -- Vérifier que la contrainte existe avec ON DELETE SET NULL
  SELECT pg_get_constraintdef(oid)
  INTO v_constraint_def
  FROM pg_constraint
  WHERE conname = 'cash_flow_forecast_actual_transaction_id_fkey'
    AND conrelid = 'cash_flow_forecast'::regclass;

  IF v_constraint_def IS NOT NULL THEN
    IF v_constraint_def LIKE '%ON DELETE SET NULL%' THEN
      RAISE NOTICE '✅ Contrainte mise à jour avec succès (ON DELETE SET NULL)';
      RAISE NOTICE 'ℹ️ Les transactions peuvent maintenant être supprimées sans erreur';
    ELSE
      RAISE WARNING '⚠️ La contrainte existe mais sans ON DELETE SET NULL';
    END IF;
  ELSE
    RAISE WARNING '⚠️ La contrainte n''existe pas';
  END IF;
END $$;

-- 4. Créer trigger pour supprimer les parts d'investisseur quand une transaction est supprimée
CREATE OR REPLACE FUNCTION auto_delete_investor_shares_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la transaction supprimée était un investissement, supprimer les parts correspondantes
  IF OLD.type = 'investissement' AND OLD.investor_id IS NOT NULL THEN
    DELETE FROM investor_investments
    WHERE investor_id = OLD.investor_id
      AND investment_date = OLD.date
      AND amount_invested = OLD.amount;

    RAISE NOTICE 'Parts d''investisseur supprimées pour la transaction % (montant: % CAD)',
      OLD.id, OLD.amount;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_delete_investor_shares ON transactions;

CREATE TRIGGER auto_delete_investor_shares
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_delete_investor_shares_on_transaction_delete();

COMMENT ON FUNCTION auto_delete_investor_shares_on_transaction_delete IS
  'Supprime automatiquement les parts d''investisseur quand une transaction d''investissement est supprimée';

-- Message de succès
SELECT
  '✅ MIGRATION 78 TERMINÉE' as status,
  'Toutes les contraintes mises à jour - Suppression de transactions autorisée + Nettoyage automatique des parts' as message;
