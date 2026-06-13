-- Migration 217 : Recalcule le statut de paiement à l'INSERT d'une transaction
-- =====================================================================
-- BUG : marquer un achat de condo « payé » en enregistrant une transaction
--   liée ne met PAS à jour payment_schedules.status partout. Le dashboard
--   bascule (il calcule le statut en JS depuis la couverture des transactions),
--   mais ProjetTab et PaymentScheduleManager lisent le CHAMP BRUT
--   payment_schedules.status → restent « à venir » / « en retard ».
--
-- CAUSE : mig.96 a créé recalculate_payment_status() + des triggers sur
--   DELETE et UPDATE de transactions, mais JAMAIS sur INSERT. Donc une
--   nouvelle transaction liée à un paiement ne déclenche aucun recalcul du
--   champ status. (mig.99 a déjà rendu le calcul correct en multi-devise
--   CAD↔USD — rien à corriger de ce côté.)
--
-- CORRECTIF :
--   1. Trigger AFTER INSERT ON transactions → recalculate_payment_status().
--   2. Backfill : recalcule tous les paiements ayant des transactions liées,
--      pour réaligner ceux déjà mal étiquetés.
-- =====================================================================

-- ─── 1. Trigger INSERT manquant ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_recalculate_payment_on_transaction_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_schedule_id IS NOT NULL THEN
    PERFORM recalculate_payment_status(NEW.payment_schedule_id);
    RAISE NOTICE 'Transaction % insérée, recalcul du paiement %', NEW.id, NEW.payment_schedule_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_payment_on_insert ON transactions;
CREATE TRIGGER trigger_recalculate_payment_on_insert
AFTER INSERT ON transactions
FOR EACH ROW
WHEN (NEW.payment_schedule_id IS NOT NULL)
EXECUTE FUNCTION auto_recalculate_payment_on_transaction_insert();

-- ─── 2. Backfill : réaligner les statuts existants ───────────────────────────
DO $$
DECLARE
  r       RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT payment_schedule_id
    FROM transactions
    WHERE payment_schedule_id IS NOT NULL
  LOOP
    PERFORM recalculate_payment_status(r.payment_schedule_id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 217 : trigger INSERT ajouté + % paiement(s) recalculé(s)', v_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ─── Vérification ────────────────────────────────────────────────────────────
-- Doit lister les 3 triggers de recalcul (insert / update / delete).
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'transactions'::regclass
  AND tgname LIKE 'trigger_recalculate_payment%'
ORDER BY tgname;
