-- =====================================================
-- SCRIPT 27: SUIVI DES VALEURS RÉELLES VS PROJECTIONS
-- =====================================================
-- Description: Table pour stocker les valeurs réelles année par année
--              pour comparer avec les projections du scénario
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- Table pour les valeurs réelles annuelles
CREATE TABLE IF NOT EXISTS scenario_actual_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,

  -- Valeurs réelles
  property_value DECIMAL(12,2),
  rental_income DECIMAL(12,2),
  management_fees DECIMAL(12,2),
  net_income DECIMAL(12,2),
  cumulative_cashflow DECIMAL(12,2),
  occupancy_rate DECIMAL(5,2), -- Taux d'occupation réel

  -- Métadonnées
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte unique : une seule entrée par scénario et année
  UNIQUE(scenario_id, year)
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_actual_values_scenario ON scenario_actual_values(scenario_id);
CREATE INDEX IF NOT EXISTS idx_actual_values_year ON scenario_actual_values(year);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_actual_values_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_actual_values_timestamp
  BEFORE UPDATE ON scenario_actual_values
  FOR EACH ROW
  EXECUTE FUNCTION update_actual_values_timestamp();

-- Commentaires sur les colonnes
COMMENT ON TABLE scenario_actual_values IS 'Valeurs réelles année par année pour comparer avec les projections';
COMMENT ON COLUMN scenario_actual_values.scenario_id IS 'Référence au scénario/projet';
COMMENT ON COLUMN scenario_actual_values.year IS 'Année (1, 2, 3, etc. depuis le début du projet)';
COMMENT ON COLUMN scenario_actual_values.property_value IS 'Valeur réelle de la propriété';
COMMENT ON COLUMN scenario_actual_values.rental_income IS 'Revenus locatifs réels';
COMMENT ON COLUMN scenario_actual_values.management_fees IS 'Frais de gestion réels';
COMMENT ON COLUMN scenario_actual_values.net_income IS 'Revenu net réel';
COMMENT ON COLUMN scenario_actual_values.cumulative_cashflow IS 'Cashflow cumulatif réel';
COMMENT ON COLUMN scenario_actual_values.occupancy_rate IS 'Taux d''occupation réel (%)';
COMMENT ON COLUMN scenario_actual_values.notes IS 'Notes et commentaires pour cette année';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 27: SUIVI VALEURS RÉELLES CRÉÉ';
  RAISE NOTICE '';
  RAISE NOTICE 'Table créée:';
  RAISE NOTICE '  - scenario_actual_values: Valeurs réelles par année';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctionnalités:';
  RAISE NOTICE '  - Stockage valeurs réelles année par année';
  RAISE NOTICE '  - Comparaison avec projections du scénario';
  RAISE NOTICE '  - Contrainte unique par scénario/année';
  RAISE NOTICE '  - Trigger auto-update de updated_at';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Prêt pour saisie valeurs réelles vs projections';
END $$;
