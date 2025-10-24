-- =====================================================
-- Script 50: FRAIS RÉCURRENTS DANS SCÉNARIOS
-- =====================================================
-- Date: 2025-01-24
-- Description: Ajouter la possibilité d'enregistrer des frais récurrents
--              dans les scénarios (HOA, entretien pelouse, piscine, etc.)
-- =====================================================

-- Ajouter colonne recurring_fees à la table scenarios
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS recurring_fees JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN scenarios.recurring_fees IS 'Frais récurrents (HOA, entretien, etc.) - Array de {label, amount, frequency, currency}';

-- Index pour recherche dans JSONB
CREATE INDEX IF NOT EXISTS idx_scenarios_recurring_fees ON scenarios USING GIN (recurring_fees);

-- Exemple de structure recurring_fees:
-- [
--   {
--     "label": "HOA Fees",
--     "amount": 150,
--     "frequency": "monthly",
--     "currency": "USD"
--   },
--   {
--     "label": "Entretien pelouse",
--     "amount": 100,
--     "frequency": "monthly",
--     "currency": "USD"
--   },
--   {
--     "label": "Entretien piscine",
--     "amount": 600,
--     "frequency": "annual",
--     "currency": "USD"
--   }
-- ]

-- =====================================================
-- FONCTION: CALCULER TOTAL DES FRAIS RÉCURRENTS MENSUELS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_monthly_recurring_fees(
  p_recurring_fees JSONB,
  p_exchange_rate DECIMAL(10, 4) DEFAULT 1.35
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  v_total_monthly_usd DECIMAL(12, 2) := 0;
  v_fee JSONB;
BEGIN
  -- Parcourir chaque frais
  FOR v_fee IN SELECT * FROM jsonb_array_elements(p_recurring_fees)
  LOOP
    IF (v_fee->>'frequency') = 'monthly' THEN
      -- Frais mensuels directs
      v_total_monthly_usd := v_total_monthly_usd + (v_fee->>'amount')::DECIMAL(12, 2);
    ELSIF (v_fee->>'frequency') = 'annual' THEN
      -- Frais annuels convertis en mensuels
      v_total_monthly_usd := v_total_monthly_usd + ((v_fee->>'amount')::DECIMAL(12, 2) / 12);
    END IF;
  END LOOP;

  RETURN v_total_monthly_usd;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_monthly_recurring_fees IS 'Calculer le total mensuel des frais récurrents (convertit annuel en mensuel)';

-- =====================================================
-- VUE: SCÉNARIOS AVEC TOTAL FRAIS RÉCURRENTS
-- =====================================================

CREATE OR REPLACE VIEW scenarios_with_recurring_totals AS
SELECT
  s.*,
  calculate_monthly_recurring_fees(s.recurring_fees) as total_recurring_fees_monthly_usd,
  calculate_monthly_recurring_fees(s.recurring_fees) * 12 as total_recurring_fees_annual_usd
FROM scenarios s;

COMMENT ON VIEW scenarios_with_recurring_totals IS 'Scénarios avec calcul automatique des totaux de frais récurrents';

-- =====================================================
-- MIGRATION: TRANSFÉRER recurring_fees AU PROJET
-- =====================================================

-- Ajouter colonne recurring_fees à properties pour les projets convertis
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS recurring_fees JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN properties.recurring_fees IS 'Frais récurrents transférés depuis le scénario (HOA, entretien, etc.)';

CREATE INDEX IF NOT EXISTS idx_properties_recurring_fees ON properties USING GIN (recurring_fees);

-- Note: La copie des recurring_fees du scénario vers la propriété se fera
-- dans le code TypeScript lors de la conversion (ScenariosTab.tsx)

-- =====================================================
-- EXEMPLE D'INSERTION
-- =====================================================

-- Exemple: Ajouter des frais récurrents à un scénario existant
-- UPDATE scenarios
-- SET recurring_fees = '[
--   {"label": "HOA Fees", "amount": 150, "frequency": "monthly", "currency": "USD"},
--   {"label": "Entretien piscine", "amount": 1200, "frequency": "annual", "currency": "USD"}
-- ]'::jsonb
-- WHERE id = 'UUID_DU_SCENARIO';
