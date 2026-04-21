-- ==========================================
-- MIGRATION 99: CORRIGER CONVERSION DEVISES PAIEMENTS
-- ==========================================
--
-- PROBLÈME: La vue v_payment_schedules_detail compare USD et CAD directement
--           Exemple: Paiement 25,065 USD vs Transaction 35,507 CAD
--           Résultat: -10,442 USD (négatif et incorrect)
--
-- SOLUTION: Convertir les transactions CAD en devise du paiement
--           Afficher montant CAD + montant converti + taux de change
--
-- ==========================================

-- SUPPRIMER COMPLÈTEMENT LA VUE (nécessaire pour changer les noms de colonnes)
DROP VIEW IF EXISTS v_payment_schedules_detail CASCADE;

-- RECRÉER LA VUE AVEC LES NOUVEAUX CHAMPS
CREATE VIEW v_payment_schedules_detail AS
SELECT
  ps.*,
  p.name as property_name,
  p.location as property_location,
  p.currency as property_currency,

  -- Compter transactions liées
  COALESCE(t_summary.transaction_count, 0) as transaction_count,

  -- Montant total payé en CAD (montant réel des transactions)
  COALESCE(t_summary.total_paid_cad, 0) as total_amount_paid_cad,

  -- Montant total payé dans la devise du paiement (avec conversion si nécessaire)
  COALESCE(t_summary.total_paid_payment_currency, 0) as total_amount_paid,

  -- Montant restant (dans la devise du paiement)
  ps.amount - COALESCE(t_summary.total_paid_payment_currency, 0) as remaining_amount,

  -- Progression (pourcentage)
  CASE
    WHEN ps.amount > 0 THEN (COALESCE(t_summary.total_paid_payment_currency, 0) / ps.amount * 100)
    ELSE 0
  END as payment_progress_percent,

  -- Taux de change moyen utilisé
  t_summary.avg_exchange_rate,

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

    -- Montant total en CAD (montant réel payé)
    SUM(ABS(t.amount)) as total_paid_cad,

    -- Montant total dans la devise du paiement (avec conversion)
    SUM(
      CASE
        -- Si transaction a un source_currency en USD et paiement est en USD, utiliser source_amount
        WHEN ps.currency = 'USD' AND t.source_currency = 'USD' AND t.source_amount IS NOT NULL
        THEN ABS(t.source_amount)

        -- Si transaction en CAD et paiement en USD, convertir avec exchange_rate de la transaction
        WHEN ps.currency = 'USD' AND t.source_currency != 'USD'
        THEN ABS(t.amount) / COALESCE(t.exchange_rate, 1.35)

        -- Si les devises correspondent, utiliser le montant tel quel
        ELSE ABS(t.amount)
      END
    ) as total_paid_payment_currency,

    -- Taux de change moyen utilisé
    AVG(
      CASE
        WHEN ps.currency = 'USD' AND t.source_currency != 'USD'
        THEN COALESCE(t.exchange_rate, 1.35)
        ELSE NULL
      END
    ) as avg_exchange_rate

  FROM transactions t
  WHERE t.payment_schedule_id = ps.id
) t_summary ON TRUE
ORDER BY ps.due_date ASC;

COMMENT ON VIEW v_payment_schedules_detail IS
  'Vue détaillée des paiements avec conversion correcte CAD→USD pour les transactions';

-- Mettre à jour aussi la fonction recalculate_payment_status pour utiliser la conversion
CREATE OR REPLACE FUNCTION recalculate_payment_status(p_payment_schedule_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_paid DECIMAL(15, 2);
  v_payment_amount DECIMAL(12, 2);
  v_payment_currency TEXT;
  v_transaction_count INTEGER;
BEGIN
  -- Récupérer le montant et la devise du paiement
  SELECT amount, currency INTO v_payment_amount, v_payment_currency
  FROM payment_schedules
  WHERE id = p_payment_schedule_id;

  IF v_payment_amount IS NULL THEN
    RAISE NOTICE 'Payment schedule % not found', p_payment_schedule_id;
    RETURN;
  END IF;

  -- Calculer le total payé avec conversion de devise
  SELECT
    COUNT(*),
    COALESCE(SUM(
      CASE
        -- Si transaction a source_amount en USD et paiement en USD
        WHEN v_payment_currency = 'USD' AND t.source_currency = 'USD' AND t.source_amount IS NOT NULL
        THEN ABS(t.source_amount)

        -- Si transaction en CAD et paiement en USD, convertir
        WHEN v_payment_currency = 'USD' AND t.source_currency != 'USD'
        THEN ABS(t.amount) / COALESCE(t.exchange_rate, 1.35)

        -- Sinon utiliser le montant tel quel
        ELSE ABS(t.amount)
      END
    ), 0)
  INTO v_transaction_count, v_total_paid
  FROM transactions t
  WHERE t.payment_schedule_id = p_payment_schedule_id
    AND t.amount != 0;

  RAISE NOTICE 'Payment %: % transactions, % paid in % (need: %)',
    p_payment_schedule_id, v_transaction_count, v_total_paid, v_payment_currency, v_payment_amount;

  -- Recalculer le statut
  IF v_transaction_count = 0 THEN
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
    UPDATE payment_schedules
    SET
      status = 'paid',
      updated_at = NOW()
    WHERE id = p_payment_schedule_id
      AND status != 'paid';

    RAISE NOTICE 'Payment % marked as paid (fully paid)', p_payment_schedule_id;

  ELSE
    UPDATE payment_schedules
    SET
      status = 'partial',
      updated_at = NOW()
    WHERE id = p_payment_schedule_id;

    RAISE NOTICE 'Payment % marked as partial (% / %)', p_payment_schedule_id, v_total_paid, v_payment_amount;
  END IF;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_payment_status IS
  'Recalcule le statut avec conversion correcte CAD→USD si nécessaire';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 99 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Vue v_payment_schedules_detail mise à jour';
  RAISE NOTICE '📊 Fonction recalculate_payment_status mise à jour';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Conversions de devises:';
  RAISE NOTICE '   • Transaction CAD → Paiement USD: Division par exchange_rate';
  RAISE NOTICE '   • Transaction USD → Paiement USD: Utilise source_amount';
  RAISE NOTICE '   • Garde montant CAD original pour affichage';
  RAISE NOTICE '   • Calcule taux de change moyen';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Les montants payés et restants sont maintenant corrects';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
