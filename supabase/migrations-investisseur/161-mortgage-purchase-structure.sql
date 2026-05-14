-- =====================================================
-- MIGRATION 161: STRUCTURE D'ACHAT HYPOTHÉCAIRE
-- =====================================================
-- Objectif :
--   Permettre au formulaire "nouveau scénario" de représenter tout type
--   d'achat immobilier : comptant, pré-construction (termes fixes) ET
--   achat avec mise de fonds + prêt hypothécaire.
--
--   La structure hypothécaire se transfère dans le projet à l'approbation.
--   Le suivi se fait via UNE échéance récurrente (is_recurring) qui avance
--   automatiquement à chaque transaction liée, avec solde décroissant et
--   décompte vers la date de renouvellement du terme.
--
-- Décisions (validées avec Eric 2026-05-14) :
--   - Calcul automatique du paiement (capital+intérêt) via formule standard
--   - 1 échéance récurrente par hypothèque (pas N lignes)
--   - Types d'achat existants conservés ('cash'/'preconstruction')
--   - Décompte renouvellement = badge + jours restants
--
-- Dépendances : 9 (payment_schedules), 15 (link transactions), 20 (scenarios)
-- =====================================================

-- =====================================================
-- 1. SCÉNARIOS : champs structure d'achat + hypothèque
-- =====================================================
ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(20) DEFAULT 'cash'
    CHECK (purchase_type IN ('cash', 'preconstruction', 'mortgage')),
  ADD COLUMN IF NOT EXISTS mortgage_rate_type VARCHAR(10) DEFAULT 'fixed'
    CHECK (mortgage_rate_type IN ('fixed', 'variable')),
  ADD COLUMN IF NOT EXISTS mortgage_term_years INTEGER,
  ADD COLUMN IF NOT EXISTS mortgage_payment_frequency VARCHAR(20)
    CHECK (mortgage_payment_frequency IN ('biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS mortgage_start_date DATE,
  ADD COLUMN IF NOT EXISTS mortgage_renewal_date DATE,
  ADD COLUMN IF NOT EXISTS mortgage_payment_amount DECIMAL(15, 2);

COMMENT ON COLUMN scenarios.purchase_type IS 'Type d''achat: cash (comptant), preconstruction (termes fixes), mortgage (mise de fonds + prêt)';
COMMENT ON COLUMN scenarios.mortgage_rate_type IS 'Type de taux hypothécaire: fixed ou variable';
COMMENT ON COLUMN scenarios.mortgage_term_years IS 'Durée du terme hypothécaire en années (ex: 5) — période avant renouvellement';
COMMENT ON COLUMN scenarios.mortgage_payment_frequency IS 'Fréquence des paiements: biweekly (aux 2 semaines) ou monthly';
COMMENT ON COLUMN scenarios.mortgage_start_date IS 'Date de début du prêt hypothécaire';
COMMENT ON COLUMN scenarios.mortgage_renewal_date IS 'Date de renouvellement du terme = mortgage_start_date + mortgage_term_years';
COMMENT ON COLUMN scenarios.mortgage_payment_amount IS 'Montant du paiement (capital+intérêt) calculé automatiquement, ajustable manuellement';
-- Réutilise les colonnes existantes : down_payment (%), interest_rate (%), loan_duration (= amortissement en années)

-- Backfill purchase_type pour les scénarios existants (sans changer leur comportement)
UPDATE scenarios
SET purchase_type = CASE
  WHEN payment_type = 'financed' THEN 'mortgage'
  WHEN payment_terms IS NOT NULL AND jsonb_array_length(payment_terms) > 0 THEN 'preconstruction'
  ELSE 'cash'
END
WHERE purchase_type IS NULL OR purchase_type = 'cash';

-- =====================================================
-- 2. PROPRIÉTÉS : mêmes champs (transfert à l'approbation)
-- =====================================================
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(20) DEFAULT 'cash'
    CHECK (purchase_type IN ('cash', 'preconstruction', 'mortgage')),
  ADD COLUMN IF NOT EXISTS down_payment DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_duration INTEGER,
  ADD COLUMN IF NOT EXISTS mortgage_rate_type VARCHAR(10) DEFAULT 'fixed'
    CHECK (mortgage_rate_type IN ('fixed', 'variable')),
  ADD COLUMN IF NOT EXISTS mortgage_term_years INTEGER,
  ADD COLUMN IF NOT EXISTS mortgage_payment_frequency VARCHAR(20)
    CHECK (mortgage_payment_frequency IN ('biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS mortgage_start_date DATE,
  ADD COLUMN IF NOT EXISTS mortgage_renewal_date DATE,
  ADD COLUMN IF NOT EXISTS mortgage_payment_amount DECIMAL(15, 2);

COMMENT ON COLUMN properties.purchase_type IS 'Type d''achat: cash, preconstruction, mortgage — transféré depuis le scénario à l''approbation';
COMMENT ON COLUMN properties.down_payment IS 'Mise de fonds en % (hypothèque)';
COMMENT ON COLUMN properties.interest_rate IS 'Taux d''intérêt annuel en % (hypothèque)';
COMMENT ON COLUMN properties.loan_duration IS 'Amortissement total du prêt en années (ex: 25)';
COMMENT ON COLUMN properties.mortgage_term_years IS 'Durée du terme avant renouvellement en années (ex: 5)';
COMMENT ON COLUMN properties.mortgage_payment_frequency IS 'Fréquence: biweekly ou monthly';
COMMENT ON COLUMN properties.mortgage_renewal_date IS 'Date de renouvellement du terme';
COMMENT ON COLUMN properties.mortgage_payment_amount IS 'Montant du paiement hypothécaire (capital+intérêt)';

UPDATE properties SET purchase_type = 'cash' WHERE purchase_type IS NULL;

-- =====================================================
-- 3. PAYMENT_SCHEDULES : support échéance récurrente
-- =====================================================
ALTER TABLE payment_schedules
  ADD COLUMN IF NOT EXISTS payment_kind VARCHAR(20) DEFAULT 'fixed_term'
    CHECK (payment_kind IN ('fixed_term', 'mortgage')),
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20)
    CHECK (recurrence_frequency IN ('biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
  ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS payments_made INTEGER DEFAULT 0;

COMMENT ON COLUMN payment_schedules.payment_kind IS 'fixed_term (terme de paiement classique) ou mortgage (échéance hypothécaire récurrente)';
COMMENT ON COLUMN payment_schedules.is_recurring IS 'TRUE pour une échéance hypothécaire qui avance automatiquement à chaque transaction liée';
COMMENT ON COLUMN payment_schedules.recurrence_frequency IS 'Fréquence de récurrence: biweekly ou monthly';
COMMENT ON COLUMN payment_schedules.recurrence_end_date IS 'Date de renouvellement du terme — la récurrence s''arrête ici en attendant le renouvellement';
COMMENT ON COLUMN payment_schedules.remaining_balance IS 'Solde restant du prêt — décroît à chaque paiement';
COMMENT ON COLUMN payment_schedules.payments_made IS 'Nombre de paiements effectués sur l''échéance récurrente';

-- =====================================================
-- 4. FONCTION : calcul du paiement hypothécaire
-- =====================================================
-- Formule d'amortissement standard :
--   P = L * (c(1+c)^n) / ((1+c)^n - 1)
--   L = montant du prêt, c = taux périodique, n = nombre total de paiements
CREATE OR REPLACE FUNCTION calculate_mortgage_payment(
  p_loan_amount DECIMAL,
  p_annual_rate DECIMAL,        -- en % (ex: 5.25)
  p_amortization_years INTEGER, -- ex: 25
  p_frequency VARCHAR           -- 'biweekly' | 'monthly'
) RETURNS DECIMAL AS $$
DECLARE
  periods_per_year INTEGER;
  n INTEGER;
  c DECIMAL;
  payment DECIMAL;
BEGIN
  IF p_loan_amount IS NULL OR p_loan_amount <= 0
     OR p_amortization_years IS NULL OR p_amortization_years <= 0 THEN
    RETURN 0;
  END IF;

  periods_per_year := CASE WHEN p_frequency = 'biweekly' THEN 26 ELSE 12 END;
  n := p_amortization_years * periods_per_year;
  c := (COALESCE(p_annual_rate, 0) / 100.0) / periods_per_year;

  IF c = 0 THEN
    payment := p_loan_amount / n;
  ELSE
    payment := p_loan_amount * (c * power(1 + c, n)) / (power(1 + c, n) - 1);
  END IF;

  RETURN ROUND(payment, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_mortgage_payment IS 'Calcule le paiement périodique (capital+intérêt) d''un prêt hypothécaire selon la formule d''amortissement standard';

-- =====================================================
-- 5. FONCTION : générer l'échéance récurrente d'une propriété
-- =====================================================
-- Crée UNE ligne payment_schedules récurrente pour le suivi de l'hypothèque.
CREATE OR REPLACE FUNCTION generate_mortgage_schedule(p_property_id UUID)
RETURNS UUID AS $$
DECLARE
  v_property RECORD;
  v_loan_amount DECIMAL(15, 2);
  v_payment DECIMAL(15, 2);
  v_first_due DATE;
  v_schedule_id UUID;
BEGIN
  SELECT * INTO v_property FROM properties WHERE id = p_property_id;

  IF v_property.id IS NULL THEN
    RAISE EXCEPTION 'Property % not found', p_property_id;
  END IF;

  IF v_property.purchase_type <> 'mortgage' THEN
    RAISE NOTICE 'Property % is not a mortgage purchase, skipping', p_property_id;
    RETURN NULL;
  END IF;

  -- Montant du prêt = coût total - mise de fonds
  v_loan_amount := v_property.total_cost
    - (v_property.total_cost * COALESCE(v_property.down_payment, 0) / 100.0);

  -- Paiement : utiliser le montant stocké (ajustable) sinon calculer
  v_payment := COALESCE(
    v_property.mortgage_payment_amount,
    calculate_mortgage_payment(
      v_loan_amount,
      v_property.interest_rate,
      v_property.loan_duration,
      v_property.mortgage_payment_frequency
    )
  );

  -- Première échéance = date de début (ou aujourd'hui si non définie)
  v_first_due := COALESCE(v_property.mortgage_start_date, CURRENT_DATE);

  -- Supprimer une éventuelle échéance hypothécaire existante (idempotent)
  DELETE FROM payment_schedules
  WHERE property_id = p_property_id AND payment_kind = 'mortgage';

  INSERT INTO payment_schedules (
    property_id, term_number, term_label,
    amount, currency,
    due_date, status,
    payment_kind, is_recurring, recurrence_frequency,
    recurrence_end_date, remaining_balance, payments_made
  ) VALUES (
    p_property_id, 1, 'Hypothèque',
    v_payment, COALESCE(v_property.currency, 'CAD'),
    v_first_due, 'pending',
    'mortgage', TRUE, v_property.mortgage_payment_frequency,
    v_property.mortgage_renewal_date, v_loan_amount, 0
  )
  RETURNING id INTO v_schedule_id;

  RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_mortgage_schedule IS 'Crée l''échéance récurrente unique de suivi pour une propriété de type mortgage';

-- =====================================================
-- 6. TRIGGER : avancer l'échéance récurrente au lieu de la marquer payée
-- =====================================================
-- On remplace auto_mark_payment_as_paid pour gérer le cas hypothécaire :
--   - échéance classique (fixed_term) : comportement inchangé (marquée 'paid')
--   - échéance récurrente (mortgage)  : on décrémente le solde, on incrémente
--     le compteur, et on avance due_date à la prochaine occurrence (sans
--     marquer 'paid' — elle reste 'pending' tant que le terme n'est pas échu)
CREATE OR REPLACE FUNCTION auto_mark_payment_as_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_exchange_rate DECIMAL(10, 4);
  v_amount_in_cad DECIMAL(15, 2);
  v_schedule RECORD;
  v_next_due DATE;
BEGIN
  IF NEW.payment_schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_schedule FROM payment_schedules WHERE id = NEW.payment_schedule_id;

  IF v_schedule.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ----- CAS 1 : échéance hypothécaire récurrente -----
  IF v_schedule.payment_kind = 'mortgage' AND v_schedule.is_recurring THEN
    -- Prochaine échéance selon la fréquence
    IF v_schedule.recurrence_frequency = 'biweekly' THEN
      v_next_due := v_schedule.due_date + INTERVAL '14 days';
    ELSE
      v_next_due := v_schedule.due_date + INTERVAL '1 month';
    END IF;

    UPDATE payment_schedules
    SET
      remaining_balance = GREATEST(COALESCE(remaining_balance, 0) - NEW.amount, 0),
      payments_made = COALESCE(payments_made, 0) + 1,
      due_date = v_next_due,
      -- reste 'pending' tant que la date de renouvellement n'est pas atteinte
      status = CASE
        WHEN recurrence_end_date IS NOT NULL AND v_next_due > recurrence_end_date
          THEN 'paid'   -- terme complété → en attente de renouvellement
        ELSE 'pending'
      END,
      updated_at = NOW()
    WHERE id = NEW.payment_schedule_id;

    RAISE NOTICE 'Mortgage schedule % advanced to % via transaction %',
      NEW.payment_schedule_id, v_next_due, NEW.id;
    RETURN NEW;
  END IF;

  -- ----- CAS 2 : échéance classique (comportement original) -----
  v_exchange_rate := get_current_exchange_rate('USD', 'CAD');
  v_amount_in_cad := NEW.amount * v_exchange_rate;

  UPDATE payment_schedules
  SET
    status = 'paid',
    paid_date = NEW.date,
    amount_paid_cad = v_amount_in_cad,
    exchange_rate_used = v_exchange_rate,
    updated_at = NOW()
  WHERE id = NEW.payment_schedule_id
    AND status IN ('pending', 'overdue');

  RAISE NOTICE 'Payment schedule % marked as paid via transaction %',
    NEW.payment_schedule_id, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VÉRIFICATION
-- =====================================================
SELECT
  '✅ MIGRATION 161 — STRUCTURE HYPOTHÉCAIRE' as status,
  'scenarios + properties: purchase_type, mortgage_*' as schema_scenarios,
  'payment_schedules: payment_kind, is_recurring, recurrence_*, remaining_balance' as schema_payments,
  'Fonctions: calculate_mortgage_payment, generate_mortgage_schedule' as functions,
  'Trigger auto_mark_payment_as_paid mis à jour (cas récurrent hypothécaire)' as triggers;
