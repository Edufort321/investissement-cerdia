-- ==========================================
-- SYSTÈME DE PAIEMENTS ÉCHELONNÉS
-- Gestion des paiements par termes ou mensuels
-- ==========================================

-- Étape 1: Ajouter colonnes à la table properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS payment_schedule_type VARCHAR(20) DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS monthly_payment_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS payment_start_date DATE,
ADD COLUMN IF NOT EXISTS payment_end_date DATE,
ADD COLUMN IF NOT EXISTS reservation_deposit DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reservation_deposit_cad DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid_cad DECIMAL(12, 2) DEFAULT 0;

COMMENT ON COLUMN properties.currency IS 'Devise du projet: USD ou CAD';
COMMENT ON COLUMN properties.payment_schedule_type IS 'Type de paiement: one_time, monthly_degressive, fixed_terms';
COMMENT ON COLUMN properties.monthly_payment_amount IS 'Montant mensuel si type monthly_degressive';
COMMENT ON COLUMN properties.payment_start_date IS 'Date de début des paiements';
COMMENT ON COLUMN properties.payment_end_date IS 'Date de fin des paiements';
COMMENT ON COLUMN properties.reservation_deposit IS 'Acompte de réservation (se déduit du total)';
COMMENT ON COLUMN properties.reservation_deposit_cad IS 'Acompte de réservation en CAD';
COMMENT ON COLUMN properties.total_paid_cad IS 'Total réellement payé en CAD pour coût réel économie canadienne';

-- Étape 2: Créer la table payment_schedules pour suivre les paiements échelonnés
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Informations du paiement
  term_number INTEGER NOT NULL, -- Numéro du terme (1, 2, 3, etc.)
  term_label VARCHAR(100), -- Label optionnel (ex: "Acompte", "Versement final")
  percentage DECIMAL(5, 2), -- Pourcentage du total (pour fixed_terms)
  amount DECIMAL(12, 2) NOT NULL, -- Montant à payer
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Montant réel payé en CAD pour économie canadienne
  amount_paid_cad DECIMAL(12, 2), -- Montant réellement payé en CAD
  exchange_rate_used DECIMAL(10, 4), -- Taux de change utilisé lors du paiement

  -- Dates
  due_date DATE NOT NULL, -- Date d'échéance
  paid_date DATE, -- Date de paiement effectif

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled

  -- Alertes
  alert_days_before INTEGER DEFAULT 7, -- Nombre de jours avant pour alerter
  alert_sent BOOLEAN DEFAULT FALSE, -- Alerte envoyée?

  -- Notes
  notes TEXT,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_payment_schedules_property ON payment_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_payment_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Mettre à jour automatiquement le statut en overdue si la date est dépassée
  IF NEW.status = 'pending' AND NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  END IF;

  -- Si un paiement est marqué comme payé, mettre la date de paiement
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.paid_date IS NULL THEN
    NEW.paid_date = CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_schedule_updated_at
BEFORE UPDATE ON payment_schedules
FOR EACH ROW
EXECUTE FUNCTION update_payment_schedule_updated_at();

-- Étape 3: Fonction pour créer automatiquement un calendrier de paiements
CREATE OR REPLACE FUNCTION generate_payment_schedule(
  p_property_id UUID,
  p_payment_type VARCHAR(20),
  p_total_amount DECIMAL(12, 2),
  p_currency VARCHAR(3),
  p_start_date DATE,
  p_terms JSONB -- Pour fixed_terms: [{"label": "Acompte", "percentage": 50}, ...]
) RETURNS VOID AS $$
DECLARE
  term_record RECORD;
  term_num INT := 0;
  term_amount DECIMAL(12, 2);
  term_date DATE;
BEGIN
  -- Supprimer les paiements existants pour cette propriété
  DELETE FROM payment_schedules WHERE property_id = p_property_id;

  IF p_payment_type = 'fixed_terms' THEN
    -- Créer les paiements selon les termes fixes
    FOR term_record IN SELECT * FROM jsonb_array_elements(p_terms)
    LOOP
      term_num := term_num + 1;
      term_amount := p_total_amount * ((term_record.value->>'percentage')::DECIMAL / 100);
      term_date := p_start_date + ((term_record.value->>'days_offset')::INT || ' days')::INTERVAL;

      INSERT INTO payment_schedules (
        property_id,
        term_number,
        term_label,
        percentage,
        amount,
        currency,
        due_date,
        status
      ) VALUES (
        p_property_id,
        term_num,
        term_record.value->>'label',
        (term_record.value->>'percentage')::DECIMAL,
        term_amount,
        p_currency,
        term_date,
        'pending'
      );
    END LOOP;

  ELSIF p_payment_type = 'monthly_degressive' THEN
    -- Pour mensuel dégressif: créer un paiement par mois avec décroissance
    -- (Implémentation simplifiée - peut être personnalisée)
    RAISE NOTICE 'Monthly degressive not fully implemented yet';

  ELSIF p_payment_type = 'one_time' THEN
    -- Un seul paiement
    INSERT INTO payment_schedules (
      property_id,
      term_number,
      term_label,
      percentage,
      amount,
      currency,
      due_date,
      status
    ) VALUES (
      p_property_id,
      1,
      'Paiement unique',
      100,
      p_total_amount,
      p_currency,
      p_start_date,
      'pending'
    );
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Étape 4: Vue pour les paiements à venir (alertes)
CREATE OR REPLACE VIEW upcoming_payments AS
SELECT
  ps.*,
  p.name as property_name,
  p.location as property_location,
  (ps.due_date - CURRENT_DATE) as days_until_due,
  CASE
    WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
    WHEN ps.due_date <= CURRENT_DATE + ps.alert_days_before THEN 'alert'
    ELSE 'upcoming'
  END as alert_status
FROM payment_schedules ps
JOIN properties p ON ps.property_id = p.id
WHERE ps.status IN ('pending', 'overdue')
ORDER BY ps.due_date ASC;

-- Étape 5: Fonction pour obtenir un résumé des paiements d'une propriété
CREATE OR REPLACE FUNCTION get_property_payment_summary(p_property_id UUID)
RETURNS TABLE (
  total_amount DECIMAL(12, 2),
  paid_amount DECIMAL(12, 2),
  pending_amount DECIMAL(12, 2),
  overdue_amount DECIMAL(12, 2),
  total_terms INTEGER,
  paid_terms INTEGER,
  next_payment_date DATE,
  next_payment_amount DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(ps.amount) as total_amount,
    SUM(CASE WHEN ps.status = 'paid' THEN ps.amount ELSE 0 END) as paid_amount,
    SUM(CASE WHEN ps.status = 'pending' THEN ps.amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN ps.status = 'overdue' THEN ps.amount ELSE 0 END) as overdue_amount,
    COUNT(*)::INTEGER as total_terms,
    COUNT(CASE WHEN ps.status = 'paid' THEN 1 END)::INTEGER as paid_terms,
    MIN(CASE WHEN ps.status IN ('pending', 'overdue') THEN ps.due_date END) as next_payment_date,
    MIN(CASE WHEN ps.status IN ('pending', 'overdue') THEN ps.amount END) as next_payment_amount
  FROM payment_schedules ps
  WHERE ps.property_id = p_property_id;
END;
$$ LANGUAGE plpgsql;

-- Étape 6: RLS (Row Level Security) pour payment_schedules
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout voir
CREATE POLICY "Admin peut tout voir sur payment_schedules"
ON payment_schedules FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- Les admins peuvent tout modifier
CREATE POLICY "Admin peut tout modifier sur payment_schedules"
ON payment_schedules FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- Étape 7: Mettre à jour les propriétés existantes
UPDATE properties
SET
  currency = 'USD',
  payment_schedule_type = 'one_time'
WHERE currency IS NULL OR payment_schedule_type IS NULL;

-- Vérification finale
SELECT
  '✅ SYSTÈME DE PAIEMENTS ÉCHELONNÉS CRÉÉ' as status,
  'Tables: properties (updated), payment_schedules (new)' as tables,
  'Fonctions: generate_payment_schedule, get_property_payment_summary' as functions,
  'Vue: upcoming_payments' as views;

-- Exemple d'utilisation:
-- SELECT * FROM generate_payment_schedule(
--   'property-uuid-here',
--   'fixed_terms',
--   150000.00,
--   'USD',
--   '2025-01-01',
--   '[
--     {"label": "Acompte", "percentage": 50, "days_offset": 0},
--     {"label": "2e versement", "percentage": 20, "days_offset": 30},
--     {"label": "3e versement", "percentage": 20, "days_offset": 60},
--     {"label": "Versement final", "percentage": 10, "days_offset": 90}
--   ]'::JSONB
-- );

-- Voir les paiements à venir:
-- SELECT * FROM upcoming_payments WHERE alert_status IN ('alert', 'overdue');

-- Résumé d'une propriété:
-- SELECT * FROM get_property_payment_summary('property-uuid-here');
