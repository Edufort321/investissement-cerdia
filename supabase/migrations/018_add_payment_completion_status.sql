-- ==========================================
-- AJOUT DU STATUT DE COMPLÉTION DU PAIEMENT
-- Permet de différencier paiement complet vs partiel
-- ==========================================

-- Étape 1: Ajouter la colonne payment_completion_status dans transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_completion_status TEXT CHECK (payment_completion_status IN ('full', 'partial'));

COMMENT ON COLUMN transactions.payment_completion_status IS 'Indique si ce paiement est complet (full) ou partiel (partial). Si full, le payment_schedule sera marqué comme paid.';

-- Étape 2: Mettre à jour le trigger pour ne marquer comme payé que si payment_completion_status = 'full'
CREATE OR REPLACE FUNCTION auto_mark_payment_as_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_exchange_rate DECIMAL(10, 4);
  v_amount_in_cad DECIMAL(15, 2);
BEGIN
  -- Si la transaction a un payment_schedule_id ET que c'est un paiement complet
  IF NEW.payment_schedule_id IS NOT NULL AND (NEW.payment_completion_status = 'full' OR NEW.payment_completion_status IS NULL) THEN

    -- Obtenir le taux de change actuel
    v_exchange_rate := get_current_exchange_rate('USD', 'CAD');

    -- Calculer le montant en CAD (on suppose que les transactions sont en USD par défaut)
    v_amount_in_cad := NEW.amount * v_exchange_rate;

    -- Mettre à jour le payment_schedule
    UPDATE payment_schedules
    SET
      status = 'paid',
      paid_date = NEW.date,
      amount_paid_cad = v_amount_in_cad,
      exchange_rate_used = v_exchange_rate,
      updated_at = NOW()
    WHERE id = NEW.payment_schedule_id
      AND status IN ('pending', 'overdue'); -- Ne pas écraser si déjà payé

    -- Log l'action
    RAISE NOTICE 'Payment schedule % marked as paid via transaction %', NEW.payment_schedule_id, NEW.id;
  ELSIF NEW.payment_schedule_id IS NOT NULL AND NEW.payment_completion_status = 'partial' THEN
    -- Log pour paiement partiel
    RAISE NOTICE 'Payment schedule % linked but not marked as paid (partial payment) - transaction %', NEW.payment_schedule_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vérification
SELECT
  '✅ PAYMENT COMPLETION STATUS AJOUTÉ' as status,
  'Colonne payment_completion_status ajoutée' as column_added,
  'Trigger auto_mark_payment_as_paid modifié pour gérer full/partial' as trigger_updated;
