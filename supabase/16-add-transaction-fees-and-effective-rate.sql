-- ==========================================
-- AJOUT FRAIS BANCAIRES ET TAUX EFFECTIF
-- Calcul automatique du taux réel incluant frais
-- ==========================================

-- Ajouter colonnes pour gérer les frais et taux effectifs
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS amount_cad_paid DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS fees_cad DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS effective_exchange_rate DECIMAL(10, 4);

COMMENT ON COLUMN transactions.amount_usd IS 'Montant USD du contrat (pour paiements propriétés)';
COMMENT ON COLUMN transactions.amount_cad_paid IS 'Montant total CAD payé (conversion + frais)';
COMMENT ON COLUMN transactions.fees_cad IS 'Frais bancaires/transfert en CAD';
COMMENT ON COLUMN transactions.effective_exchange_rate IS 'Taux effectif calculé: amount_cad_paid / amount_usd (auto)';

-- Fonction pour calculer le taux effectif automatiquement
CREATE OR REPLACE FUNCTION calculate_effective_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on a amount_usd ET amount_cad_paid, calculer le taux effectif
  IF NEW.amount_usd IS NOT NULL AND NEW.amount_usd > 0 AND NEW.amount_cad_paid IS NOT NULL THEN
    NEW.effective_exchange_rate := NEW.amount_cad_paid / NEW.amount_usd;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer le taux effectif avant insertion/update
DROP TRIGGER IF EXISTS trigger_calculate_effective_rate ON transactions;
CREATE TRIGGER trigger_calculate_effective_rate
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION calculate_effective_exchange_rate();

-- Modifier la fonction auto_mark_payment_as_paid pour utiliser le taux effectif
CREATE OR REPLACE FUNCTION auto_mark_payment_as_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_effective_rate DECIMAL(10, 4);
  v_amount_cad DECIMAL(15, 2);
BEGIN
  -- Si la transaction a un payment_schedule_id, on met à jour le paiement
  IF NEW.payment_schedule_id IS NOT NULL THEN

    -- Utiliser le taux effectif si disponible, sinon calculer depuis get_current_exchange_rate
    IF NEW.effective_exchange_rate IS NOT NULL THEN
      v_effective_rate := NEW.effective_exchange_rate;
    ELSE
      v_effective_rate := get_current_exchange_rate('USD', 'CAD');
    END IF;

    -- Utiliser amount_cad_paid si disponible, sinon calculer
    IF NEW.amount_cad_paid IS NOT NULL THEN
      v_amount_cad := NEW.amount_cad_paid;
    ELSE
      v_amount_cad := NEW.amount * v_effective_rate;
    END IF;

    -- Mettre à jour le payment_schedule avec le taux effectif
    UPDATE payment_schedules
    SET
      status = 'paid',
      paid_date = NEW.date,
      amount_paid_cad = v_amount_cad,
      exchange_rate_used = v_effective_rate,
      updated_at = NOW()
    WHERE id = NEW.payment_schedule_id
      AND status IN ('pending', 'overdue');

    -- Log l'action
    RAISE NOTICE 'Payment schedule % marked as paid via transaction % (effective rate: %)',
      NEW.payment_schedule_id, NEW.id, v_effective_rate;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vue pour voir les transactions avec taux effectifs
CREATE OR REPLACE VIEW transactions_with_effective_rates AS
SELECT
  t.*,
  ps.term_label,
  ps.due_date as payment_due_date,
  ps.status as payment_status,
  p.name as property_name,
  p.location as property_location,
  -- Calculer la différence entre taux officiel et taux effectif
  CASE
    WHEN t.effective_exchange_rate IS NOT NULL THEN
      t.effective_exchange_rate - get_current_exchange_rate('USD', 'CAD')
    ELSE NULL
  END as rate_difference,
  -- Calculer le coût des frais en %
  CASE
    WHEN t.amount_cad_paid IS NOT NULL AND t.amount_usd IS NOT NULL AND t.amount_usd > 0 THEN
      ((t.amount_cad_paid - (t.amount_usd * get_current_exchange_rate('USD', 'CAD'))) / (t.amount_usd * get_current_exchange_rate('USD', 'CAD')) * 100)
    ELSE NULL
  END as fees_percentage
FROM transactions t
LEFT JOIN payment_schedules ps ON t.payment_schedule_id = ps.id
LEFT JOIN properties p ON t.property_id = p.id
ORDER BY t.date DESC;

COMMENT ON VIEW transactions_with_effective_rates IS 'Vue des transactions avec taux effectifs et analyse des frais';

-- Fonction helper pour créer une transaction avec frais
CREATE OR REPLACE FUNCTION create_payment_with_fees(
  p_payment_schedule_id UUID,
  p_amount_usd DECIMAL(15, 2),
  p_amount_cad_paid DECIMAL(15, 2),
  p_fees_cad DECIMAL(15, 2) DEFAULT 0,
  p_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_property_id UUID;
  v_term_label TEXT;
  v_effective_rate DECIMAL(10, 4);
BEGIN
  -- Calculer le taux effectif
  v_effective_rate := p_amount_cad_paid / p_amount_usd;

  -- Récupérer property_id et term_label du payment_schedule
  SELECT property_id, term_label INTO v_property_id, v_term_label
  FROM payment_schedules
  WHERE id = p_payment_schedule_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Payment schedule % not found', p_payment_schedule_id;
  END IF;

  -- Créer la transaction
  INSERT INTO transactions (
    date,
    amount,
    amount_usd,
    amount_cad_paid,
    fees_cad,
    effective_exchange_rate,
    type,
    description,
    property_id,
    payment_schedule_id,
    verified
  )
  VALUES (
    p_date,
    p_amount_usd, -- amount en USD
    p_amount_usd,
    p_amount_cad_paid,
    p_fees_cad,
    v_effective_rate,
    'investissement',
    COALESCE(p_description, 'Paiement: ' || v_term_label || ' (taux effectif: ' || v_effective_rate || ')'),
    v_property_id,
    p_payment_schedule_id,
    TRUE
  )
  RETURNING id INTO v_transaction_id;

  -- Le trigger auto_mark_payment_as_paid se déclenche automatiquement

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_payment_with_fees IS 'Créer une transaction de paiement avec frais bancaires et taux effectif calculé automatiquement';

-- Vérification finale
SELECT
  '✅ FRAIS ET TAUX EFFECTIF CONFIGURÉS' as status,
  'Colonnes amount_usd, amount_cad_paid, fees_cad, effective_exchange_rate ajoutées' as columns_added,
  'Trigger calculate_effective_exchange_rate créé' as trigger_created,
  'Fonction auto_mark_payment_as_paid mise à jour' as function_updated,
  'Vue transactions_with_effective_rates disponible' as view_created,
  'Fonction create_payment_with_fees disponible' as helper_function;

-- Exemples d'utilisation:

-- 1. Créer une transaction avec frais (méthode recommandée):
-- SELECT create_payment_with_fees(
--   'payment-schedule-uuid-here',  -- ID du paiement
--   25000.00,                       -- Montant USD (contrat)
--   33850.00,                       -- Montant CAD payé (avec frais)
--   210.00,                         -- Frais bancaires CAD
--   NOW(),                          -- Date
--   'Paiement Terme 1 avec frais bancaires'
-- );
--
-- Résultat:
-- - amount_usd = 25,000.00
-- - amount_cad_paid = 33,850.00
-- - fees_cad = 210.00
-- - effective_exchange_rate = 1.3540 (calculé auto: 33,850 / 25,000)
-- - Payment schedule marqué "paid" avec taux 1.3540

-- 2. Insérer manuellement une transaction (le taux se calcule auto):
-- INSERT INTO transactions (date, amount, amount_usd, amount_cad_paid, fees_cad, type, description, property_id, payment_schedule_id)
-- VALUES (NOW(), 25000, 25000, 33850, 210, 'investissement', 'Paiement Terme 1', 'property-uuid', 'payment-uuid');
-- (effective_exchange_rate sera calculé automatiquement par le trigger)

-- 3. Voir toutes les transactions avec analyse des frais:
-- SELECT
--   description,
--   amount_usd,
--   amount_cad_paid,
--   fees_cad,
--   effective_exchange_rate,
--   fees_percentage,
--   rate_difference
-- FROM transactions_with_effective_rates
-- WHERE effective_exchange_rate IS NOT NULL;
