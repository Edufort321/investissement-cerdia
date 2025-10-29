-- ==========================================
-- FIX: SYNCHRONISATION BIDIRECTIONNELLE PAYMENT_SCHEDULES ↔ TRANSACTIONS
-- Problème: Quand une transaction est supprimée, le paiement reste "paid"
-- Solution: Trigger qui recalcule le statut du paiement
-- ==========================================

-- ============================================
-- 1. Fonction pour recalculer le statut d'un paiement
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_payment_status(p_payment_schedule_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_paid DECIMAL(15, 2);
  v_payment_amount DECIMAL(12, 2);
  v_transaction_count INTEGER;
BEGIN
  -- Récupérer le montant du paiement
  SELECT amount INTO v_payment_amount
  FROM payment_schedules
  WHERE id = p_payment_schedule_id;

  IF v_payment_amount IS NULL THEN
    RAISE NOTICE 'Payment schedule % not found', p_payment_schedule_id;
    RETURN;
  END IF;

  -- Compter les transactions liées
  SELECT
    COUNT(*),
    COALESCE(SUM(ABS(amount)), 0)
  INTO v_transaction_count, v_total_paid
  FROM transactions
  WHERE payment_schedule_id = p_payment_schedule_id
    AND amount != 0; -- Ignorer les transactions à 0

  RAISE NOTICE 'Payment %: % transactions, % paid (need: %)',
    p_payment_schedule_id, v_transaction_count, v_total_paid, v_payment_amount;

  -- Recalculer le statut
  IF v_transaction_count = 0 THEN
    -- Aucune transaction liée → revenir à pending
    UPDATE payment_schedules
    SET
      status = 'pending',
      paid_date = NULL,
      amount_paid_cad = NULL,
      exchange_rate_used = NULL,
      updated_at = NOW()
    WHERE id = p_payment_schedule_id;

    RAISE NOTICE 'Payment % reset to pending (no transactions)', p_payment_schedule_id;

  ELSIF v_total_paid >= v_payment_amount THEN
    -- Paiement complet
    UPDATE payment_schedules
    SET
      status = 'paid',
      updated_at = NOW()
    WHERE id = p_payment_schedule_id
      AND status != 'paid';

    RAISE NOTICE 'Payment % marked as paid (fully paid)', p_payment_schedule_id;

  ELSE
    -- Paiement partiel
    UPDATE payment_schedules
    SET
      status = 'partial',
      updated_at = NOW()
    WHERE id = p_payment_schedule_id;

    RAISE NOTICE 'Payment % marked as partial (% / %)', p_payment_schedule_id, v_total_paid, v_payment_amount;
  END IF;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_payment_status IS 'Recalcule le statut d''un paiement en fonction des transactions liées';

-- ============================================
-- 2. Ajouter statut "partial" aux payment_schedules si nécessaire
-- ============================================

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE payment_schedules DROP CONSTRAINT IF EXISTS payment_schedules_status_check;

-- Ajouter nouvelle contrainte avec statut "partial"
ALTER TABLE payment_schedules
ADD CONSTRAINT payment_schedules_status_check
CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'));

-- ============================================
-- 3. Trigger sur DELETE de transaction
-- ============================================
CREATE OR REPLACE FUNCTION auto_recalculate_payment_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la transaction supprimée était liée à un paiement
  IF OLD.payment_schedule_id IS NOT NULL THEN
    -- Recalculer le statut du paiement
    PERFORM recalculate_payment_status(OLD.payment_schedule_id);

    RAISE NOTICE 'Transaction % deleted, recalculating payment %', OLD.id, OLD.payment_schedule_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_payment_on_delete
AFTER DELETE ON transactions
FOR EACH ROW
WHEN (OLD.payment_schedule_id IS NOT NULL)
EXECUTE FUNCTION auto_recalculate_payment_on_transaction_delete();

-- ============================================
-- 4. Trigger sur UPDATE de transaction (si payment_schedule_id change)
-- ============================================
CREATE OR REPLACE FUNCTION auto_recalculate_payment_on_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Si payment_schedule_id a changé
  IF OLD.payment_schedule_id IS DISTINCT FROM NEW.payment_schedule_id THEN

    -- Recalculer l'ancien paiement (s'il existait)
    IF OLD.payment_schedule_id IS NOT NULL THEN
      PERFORM recalculate_payment_status(OLD.payment_schedule_id);
      RAISE NOTICE 'Recalculating old payment %', OLD.payment_schedule_id;
    END IF;

    -- Recalculer le nouveau paiement (s'il existe)
    IF NEW.payment_schedule_id IS NOT NULL THEN
      PERFORM recalculate_payment_status(NEW.payment_schedule_id);
      RAISE NOTICE 'Recalculating new payment %', NEW.payment_schedule_id;
    END IF;

  -- Si le montant a changé (sans changer payment_schedule_id)
  ELSIF OLD.amount IS DISTINCT FROM NEW.amount AND NEW.payment_schedule_id IS NOT NULL THEN
    PERFORM recalculate_payment_status(NEW.payment_schedule_id);
    RAISE NOTICE 'Amount changed, recalculating payment %', NEW.payment_schedule_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_payment_on_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_recalculate_payment_on_transaction_update();

-- ============================================
-- 5. Fonction pour décaler toutes les dates d'un projet (retard)
-- ============================================
CREATE OR REPLACE FUNCTION shift_property_payment_dates(
  p_property_id UUID,
  p_days_offset INTEGER, -- Nombre de jours à ajouter (positif) ou retrancher (négatif)
  p_apply_to_future_only BOOLEAN DEFAULT TRUE -- Si true, ne décale que les paiements futurs
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  IF p_apply_to_future_only THEN
    -- Décaler seulement les paiements futurs (status = pending ou overdue)
    UPDATE payment_schedules
    SET
      due_date = due_date + (p_days_offset || ' days')::INTERVAL,
      updated_at = NOW()
    WHERE property_id = p_property_id
      AND status IN ('pending', 'overdue', 'partial')
      AND due_date >= CURRENT_DATE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RAISE NOTICE 'Shifted % future payments by % days for property %',
      v_updated_count, p_days_offset, p_property_id;
  ELSE
    -- Décaler TOUS les paiements
    UPDATE payment_schedules
    SET
      due_date = due_date + (p_days_offset || ' days')::INTERVAL,
      updated_at = NOW()
    WHERE property_id = p_property_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RAISE NOTICE 'Shifted ALL % payments by % days for property %',
      v_updated_count, p_days_offset, p_property_id;
  END IF;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION shift_property_payment_dates IS 'Décale toutes les dates de paiement d''une propriété (gestion des retards)';

-- ============================================
-- 6. Fonction pour éditer un paiement individuel
-- ============================================
CREATE OR REPLACE FUNCTION update_payment_schedule(
  p_payment_id UUID,
  p_term_label VARCHAR(100) DEFAULT NULL,
  p_amount DECIMAL(12, 2) DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE payment_schedules
  SET
    term_label = COALESCE(p_term_label, term_label),
    amount = COALESCE(p_amount, amount),
    due_date = COALESCE(p_due_date, due_date),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment schedule % not found', p_payment_id;
  END IF;

  RAISE NOTICE 'Payment % updated', p_payment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_payment_schedule IS 'Met à jour un paiement programmé individuel';

-- ============================================
-- 7. Fonction pour supprimer un paiement
-- ============================================
CREATE OR REPLACE FUNCTION delete_payment_schedule(p_payment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_transaction_count INTEGER;
BEGIN
  -- Vérifier s'il y a des transactions liées
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions
  WHERE payment_schedule_id = p_payment_id;

  IF v_transaction_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete payment schedule %: % transactions linked. Delete or unlink transactions first.',
      p_payment_id, v_transaction_count;
  END IF;

  DELETE FROM payment_schedules WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment schedule % not found', p_payment_id;
  END IF;

  RAISE NOTICE 'Payment % deleted', p_payment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_payment_schedule IS 'Supprime un paiement programmé (interdit si transactions liées)';

-- ============================================
-- 8. Vue améliorée avec somme des paiements partiels
-- ============================================
CREATE OR REPLACE VIEW v_payment_schedules_detail AS
SELECT
  ps.*,
  p.name as property_name,
  p.location as property_location,
  p.currency as property_currency,
  -- Compter transactions liées
  COALESCE(t_summary.transaction_count, 0) as transaction_count,
  COALESCE(t_summary.total_paid, 0) as total_amount_paid,
  -- Montant restant
  ps.amount - COALESCE(t_summary.total_paid, 0) as remaining_amount,
  -- Progression
  CASE
    WHEN ps.amount > 0 THEN (COALESCE(t_summary.total_paid, 0) / ps.amount * 100)
    ELSE 0
  END as payment_progress_percent,
  -- Statut alerte
  (ps.due_date - CURRENT_DATE) as days_until_due,
  CASE
    WHEN ps.status = 'paid' THEN 'paid'
    WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
    WHEN ps.due_date <= CURRENT_DATE + ps.alert_days_before THEN 'alert'
    ELSE 'upcoming'
  END as alert_status
FROM payment_schedules ps
LEFT JOIN properties p ON ps.property_id = p.id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) as transaction_count,
    SUM(ABS(amount)) as total_paid
  FROM transactions t
  WHERE t.payment_schedule_id = ps.id
) t_summary ON TRUE
ORDER BY ps.due_date ASC;

COMMENT ON VIEW v_payment_schedules_detail IS 'Vue détaillée des paiements avec transactions liées et progression';

-- ============================================
-- 9. Recalculer tous les paiements existants (migration)
-- ============================================
DO $$
DECLARE
  payment_record RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting payment status recalculation...';

  FOR payment_record IN
    SELECT id FROM payment_schedules WHERE status = 'paid'
  LOOP
    PERFORM recalculate_payment_status(payment_record.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated % payment schedules', v_count;
END $$;

-- ============================================
-- Vérification finale
-- ============================================
SELECT
  '✅ SYNCHRONISATION PAYMENT_SCHEDULES CORRIGÉE' as status,
  'Triggers: DELETE + UPDATE créés' as triggers,
  'Fonctions: recalculate_payment_status, shift_property_payment_dates, update_payment_schedule' as functions,
  'Vue: v_payment_schedules_detail (avec progression)' as views,
  'Statut: partial ajouté' as status_partial;

-- ============================================
-- Exemples d'utilisation
-- ============================================

-- 1. Recalculer manuellement le statut d'un paiement
-- SELECT recalculate_payment_status('payment-uuid-here');

-- 2. Décaler tous les paiements futurs d'une propriété de 30 jours (retard)
-- SELECT shift_property_payment_dates('property-uuid', 30, TRUE);

-- 3. Décaler tous les paiements (y compris passés) de -7 jours
-- SELECT shift_property_payment_dates('property-uuid', -7, FALSE);

-- 4. Modifier un paiement individuel
-- SELECT update_payment_schedule(
--   'payment-uuid',
--   'Paiement final modifié', -- term_label
--   125000.00, -- amount
--   '2026-12-31', -- due_date
--   'Date ajustée suite à retard construction' -- notes
-- );

-- 5. Voir tous les paiements avec détails
-- SELECT * FROM v_payment_schedules_detail WHERE property_id = 'property-uuid';

-- 6. Supprimer un paiement (seulement si aucune transaction liée)
-- SELECT delete_payment_schedule('payment-uuid');
