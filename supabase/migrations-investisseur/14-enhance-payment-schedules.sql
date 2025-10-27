-- ==========================================
-- AMÉLIORATIONS DU SYSTÈME DE PAIEMENTS
-- Dates personnalisées + Alertes email + Conversion CAD automatique
-- ==========================================

-- Étape 1: Ajouter colonnes pour tracking des alertes email
ALTER TABLE payment_schedules
ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS alert_10_days_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alert_5_days_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_alert_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_alert_last_date DATE;

COMMENT ON COLUMN payment_schedules.last_alert_sent_at IS 'Dernière alerte email envoyée';
COMMENT ON COLUMN payment_schedules.alert_10_days_sent IS 'Alerte 10 jours avant envoyée';
COMMENT ON COLUMN payment_schedules.alert_5_days_sent IS 'Alerte 5 jours avant envoyée';
COMMENT ON COLUMN payment_schedules.daily_alert_sent IS 'Alerte quotidienne activée';
COMMENT ON COLUMN payment_schedules.daily_alert_last_date IS 'Date dernière alerte quotidienne';

-- Étape 2: Créer table pour stocker les taux de change USD→CAD historiques
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_from VARCHAR(3) NOT NULL DEFAULT 'USD',
  currency_to VARCHAR(3) NOT NULL DEFAULT 'CAD',
  rate DECIMAL(10, 4) NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(50) DEFAULT 'manual', -- manual, api, bank
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte unique pour éviter doublons
  UNIQUE (currency_from, currency_to, rate_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(rate_date DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(currency_from, currency_to);

COMMENT ON TABLE exchange_rates IS 'Taux de change historiques USD→CAD pour calculs précis';

-- Insérer un taux par défaut (à mettre à jour quotidiennement)
INSERT INTO exchange_rates (currency_from, currency_to, rate, rate_date, source)
VALUES ('USD', 'CAD', 1.35, CURRENT_DATE, 'manual')
ON CONFLICT (currency_from, currency_to, rate_date) DO NOTHING;

-- Étape 3: Fonction pour obtenir le taux de change du jour
CREATE OR REPLACE FUNCTION get_current_exchange_rate(
  p_from VARCHAR(3) DEFAULT 'USD',
  p_to VARCHAR(3) DEFAULT 'CAD'
) RETURNS DECIMAL(10, 4) AS $$
DECLARE
  v_rate DECIMAL(10, 4);
BEGIN
  -- Si même devise, retourner 1
  IF p_from = p_to THEN
    RETURN 1.0;
  END IF;

  -- Chercher le taux du jour, sinon le plus récent
  SELECT rate INTO v_rate
  FROM exchange_rates
  WHERE currency_from = p_from AND currency_to = p_to
  ORDER BY rate_date DESC
  LIMIT 1;

  -- Si aucun taux trouvé, retourner 1.35 par défaut
  IF v_rate IS NULL THEN
    v_rate := 1.35;
  END IF;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- Étape 4: Vue améliorée pour paiements à venir avec flags de couleur et montants CAD
CREATE OR REPLACE VIEW upcoming_payments_enhanced AS
SELECT
  ps.*,
  p.name as property_name,
  p.location as property_location,
  (ps.due_date - CURRENT_DATE) as days_until_due,

  -- Flag de couleur selon proximité échéance
  CASE
    WHEN ps.due_date < CURRENT_DATE THEN 'red'        -- 🔴 En retard
    WHEN ps.due_date <= CURRENT_DATE + 5 THEN 'orange' -- 🟠 Moins de 5 jours
    WHEN ps.due_date <= CURRENT_DATE + 10 THEN 'yellow' -- 🟡 Entre 5 et 10 jours
    ELSE 'green'                                        -- 🟢 Plus de 10 jours
  END as color_flag,

  -- Statut d'alerte
  CASE
    WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
    WHEN ps.due_date <= CURRENT_DATE + 5 THEN 'urgent'
    WHEN ps.due_date <= CURRENT_DATE + 10 THEN 'warning'
    ELSE 'upcoming'
  END as alert_status,

  -- Montant en CAD (si USD)
  CASE
    WHEN ps.currency = 'USD' THEN ps.amount * get_current_exchange_rate('USD', 'CAD')
    ELSE ps.amount
  END as amount_in_cad,

  -- Taux de change actuel
  CASE
    WHEN ps.currency = 'USD' THEN get_current_exchange_rate('USD', 'CAD')
    ELSE 1.0
  END as current_exchange_rate

FROM payment_schedules ps
JOIN properties p ON ps.property_id = p.id
WHERE ps.status IN ('pending', 'overdue')
ORDER BY ps.due_date ASC;

COMMENT ON VIEW upcoming_payments_enhanced IS 'Paiements à venir avec flags couleur et conversion CAD automatique';

-- Étape 5: Fonction pour obtenir les paiements nécessitant des alertes email
CREATE OR REPLACE FUNCTION get_payments_needing_alerts()
RETURNS TABLE (
  payment_id UUID,
  property_name VARCHAR(255),
  term_label VARCHAR(100),
  amount DECIMAL(12, 2),
  amount_in_cad DECIMAL(12, 2),
  currency VARCHAR(3),
  due_date DATE,
  days_until_due INTEGER,
  alert_type VARCHAR(20), -- '10_days', '5_days', 'daily_overdue'
  recipient_emails TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id as payment_id,
    p.name as property_name,
    ps.term_label,
    ps.amount,
    CASE
      WHEN ps.currency = 'USD' THEN ps.amount * get_current_exchange_rate('USD', 'CAD')
      ELSE ps.amount
    END as amount_in_cad,
    ps.currency,
    ps.due_date,
    (ps.due_date - CURRENT_DATE)::INTEGER as days_until_due,
    CASE
      WHEN ps.due_date < CURRENT_DATE AND (ps.daily_alert_last_date IS NULL OR ps.daily_alert_last_date < CURRENT_DATE)
        THEN 'daily_overdue'
      WHEN ps.due_date = CURRENT_DATE + 5 AND NOT ps.alert_5_days_sent
        THEN '5_days'
      WHEN ps.due_date = CURRENT_DATE + 10 AND NOT ps.alert_10_days_sent
        THEN '10_days'
      ELSE NULL
    END as alert_type,
    ARRAY['eric.dufort@cerdia.ai', 'alexandre.toulouse@cerdia.ai']::TEXT[] as recipient_emails
  FROM payment_schedules ps
  JOIN properties p ON ps.property_id = p.id
  WHERE ps.status IN ('pending', 'overdue')
    AND (
      -- Alerte 10 jours avant
      (ps.due_date = CURRENT_DATE + 10 AND NOT ps.alert_10_days_sent)
      OR
      -- Alerte 5 jours avant
      (ps.due_date = CURRENT_DATE + 5 AND NOT ps.alert_5_days_sent)
      OR
      -- Alerte quotidienne après échéance
      (ps.due_date < CURRENT_DATE AND (ps.daily_alert_last_date IS NULL OR ps.daily_alert_last_date < CURRENT_DATE))
    )
  ORDER BY ps.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Étape 6: Fonction pour marquer une alerte comme envoyée
CREATE OR REPLACE FUNCTION mark_alert_as_sent(
  p_payment_id UUID,
  p_alert_type VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
  IF p_alert_type = '10_days' THEN
    UPDATE payment_schedules
    SET alert_10_days_sent = TRUE,
        last_alert_sent_at = NOW()
    WHERE id = p_payment_id;

  ELSIF p_alert_type = '5_days' THEN
    UPDATE payment_schedules
    SET alert_5_days_sent = TRUE,
        last_alert_sent_at = NOW()
    WHERE id = p_payment_id;

  ELSIF p_alert_type = 'daily_overdue' THEN
    UPDATE payment_schedules
    SET daily_alert_sent = TRUE,
        daily_alert_last_date = CURRENT_DATE,
        last_alert_sent_at = NOW()
    WHERE id = p_payment_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Étape 7: Trigger pour mettre à jour automatiquement total_paid_cad dans properties
CREATE OR REPLACE FUNCTION update_property_total_paid_cad()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer le total payé en CAD pour la propriété
  UPDATE properties
  SET total_paid_cad = (
    SELECT COALESCE(SUM(amount_paid_cad), 0)
    FROM payment_schedules
    WHERE property_id = NEW.property_id
      AND status = 'paid'
      AND amount_paid_cad IS NOT NULL
  )
  WHERE id = NEW.property_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_total_paid_cad
AFTER INSERT OR UPDATE OF status, amount_paid_cad ON payment_schedules
FOR EACH ROW
WHEN (NEW.status = 'paid')
EXECUTE FUNCTION update_property_total_paid_cad();

-- Étape 8: RLS pour exchange_rates
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les taux de change
CREATE POLICY "Tous peuvent lire les taux de change"
ON exchange_rates FOR SELECT
TO authenticated
USING (true);

-- Seuls les admins peuvent modifier
CREATE POLICY "Admin peut modifier les taux de change"
ON exchange_rates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- Vérification finale
SELECT
  '✅ SYSTÈME DE PAIEMENTS AMÉLIORÉ' as status,
  'Nouvelles colonnes alertes + Table exchange_rates' as tables,
  'Fonctions: get_current_exchange_rate, get_payments_needing_alerts, mark_alert_as_sent' as functions,
  'Vue: upcoming_payments_enhanced avec flags couleur et CAD' as views;

-- Exemples d'utilisation:

-- 1. Voir les paiements à venir avec flags de couleur et montants CAD:
-- SELECT * FROM upcoming_payments_enhanced;

-- 2. Obtenir la liste des paiements nécessitant une alerte email:
-- SELECT * FROM get_payments_needing_alerts();

-- 3. Marquer une alerte comme envoyée:
-- SELECT mark_alert_as_sent('payment-uuid-here', '10_days');

-- 4. Mettre à jour le taux de change du jour:
-- INSERT INTO exchange_rates (currency_from, currency_to, rate, rate_date, source)
-- VALUES ('USD', 'CAD', 1.36, CURRENT_DATE, 'api')
-- ON CONFLICT (currency_from, currency_to, rate_date)
-- DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source;

-- 5. Obtenir le taux actuel:
-- SELECT get_current_exchange_rate('USD', 'CAD');
