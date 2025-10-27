-- ==========================================
-- LIAISON TRANSACTIONS ↔ PAYMENT SCHEDULES
-- Mise à jour automatique du statut des paiements
-- ==========================================

-- Étape 1: Ajouter colonne payment_schedule_id dans transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_schedule_id UUID REFERENCES payment_schedules(id) ON DELETE SET NULL;

COMMENT ON COLUMN transactions.payment_schedule_id IS 'Lien vers le paiement programmé si cette transaction correspond à un versement';

CREATE INDEX IF NOT EXISTS idx_transactions_payment_schedule_id ON transactions(payment_schedule_id);

-- Étape 2: Trigger pour marquer automatiquement un paiement comme "paid" quand une transaction est créée
CREATE OR REPLACE FUNCTION auto_mark_payment_as_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_exchange_rate DECIMAL(10, 4);
  v_amount_in_cad DECIMAL(15, 2);
BEGIN
  -- Si la transaction a un payment_schedule_id, on met à jour le paiement
  IF NEW.payment_schedule_id IS NOT NULL THEN

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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_mark_payment_as_paid
AFTER INSERT ON transactions
FOR EACH ROW
WHEN (NEW.payment_schedule_id IS NOT NULL)
EXECUTE FUNCTION auto_mark_payment_as_paid();

-- Étape 3: Fonction pour trouver automatiquement le prochain paiement pending d'une propriété
CREATE OR REPLACE FUNCTION find_next_pending_payment(p_property_id UUID)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  -- Trouver le paiement pending le plus ancien (par date d'échéance) pour cette propriété
  SELECT id INTO v_payment_id
  FROM payment_schedules
  WHERE property_id = p_property_id
    AND status = 'pending'
  ORDER BY due_date ASC
  LIMIT 1;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_next_pending_payment IS 'Trouve le prochain paiement en attente pour une propriété donnée';

-- Étape 4: Vue pour voir les transactions liées aux paiements
CREATE OR REPLACE VIEW transactions_with_payments AS
SELECT
  t.*,
  ps.term_label,
  ps.term_number,
  ps.due_date as payment_due_date,
  ps.status as payment_status,
  ps.percentage as payment_percentage,
  p.name as property_name,
  p.location as property_location
FROM transactions t
LEFT JOIN payment_schedules ps ON t.payment_schedule_id = ps.id
LEFT JOIN properties p ON t.property_id = p.id
ORDER BY t.date DESC;

COMMENT ON VIEW transactions_with_payments IS 'Vue des transactions avec informations de paiements liés';

-- Étape 5: Fonction helper pour créer une transaction ET marquer le paiement (usage dans l'app)
CREATE OR REPLACE FUNCTION create_payment_transaction(
  p_payment_schedule_id UUID,
  p_amount DECIMAL(15, 2),
  p_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_description TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'investissement'
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_property_id UUID;
  v_term_label TEXT;
BEGIN
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
    type,
    description,
    property_id,
    payment_schedule_id,
    verified
  )
  VALUES (
    p_date,
    p_amount,
    p_type,
    COALESCE(p_description, 'Paiement: ' || v_term_label),
    v_property_id,
    p_payment_schedule_id,
    TRUE
  )
  RETURNING id INTO v_transaction_id;

  -- Le trigger auto_mark_payment_as_paid se déclenche automatiquement

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_payment_transaction IS 'Crée une transaction et marque automatiquement le paiement comme payé';

-- Vérification finale
SELECT
  '✅ LIAISON TRANSACTIONS ↔ PAYMENTS CRÉÉE' as status,
  'Colonne payment_schedule_id ajoutée à transactions' as column_added,
  'Trigger auto_mark_payment_as_paid créé' as trigger_created,
  'Fonction find_next_pending_payment disponible' as helper_function,
  'Vue transactions_with_payments disponible' as view_created;

-- Exemples d'utilisation:

-- 1. Créer une transaction liée à un paiement (la fonction fait tout automatiquement):
-- SELECT create_payment_transaction(
--   'payment-schedule-uuid-here',
--   50000.00,
--   NOW(),
--   'Acompte versé',
--   'investissement'
-- );

-- 2. Trouver le prochain paiement pending pour une propriété:
-- SELECT find_next_pending_payment('property-uuid-here');

-- 3. Voir toutes les transactions avec leurs paiements liés:
-- SELECT * FROM transactions_with_payments;

-- 4. Insérer manuellement une transaction avec paiement:
-- INSERT INTO transactions (date, amount, type, description, property_id, payment_schedule_id)
-- VALUES (NOW(), 50000, 'investissement', 'Acompte', 'property-uuid', 'payment-uuid');
-- (Le trigger marquera automatiquement le paiement comme "paid")
