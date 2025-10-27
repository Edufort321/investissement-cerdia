-- =====================================================
-- SCRIPT 25: AJOUT FRAIS DE TRANSACTION ET STATUT CONSTRUCTION
-- =====================================================
-- Description: Ajoute transaction_fees, construction_status, delivery_date, completion_year
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- Ajouter la colonne transaction_fees (JSONB)
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS transaction_fees JSONB DEFAULT '{"type": "percentage", "percentage": 0, "fixed_amount": 0, "currency": "USD"}'::jsonb,
ADD COLUMN IF NOT EXISTS construction_status TEXT DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS completion_year INTEGER;

-- Ajouter des commentaires sur les colonnes
COMMENT ON COLUMN scenarios.transaction_fees IS 'Frais de transaction - Structure: {"type": "percentage|fixed_amount", "percentage": number, "fixed_amount": number, "currency": "CAD|USD"}';
COMMENT ON COLUMN scenarios.construction_status IS 'Statut de construction: "in_progress" ou "completed"';
COMMENT ON COLUMN scenarios.delivery_date IS 'Date de livraison prévue (si en construction)';
COMMENT ON COLUMN scenarios.completion_year IS 'Année de fin de construction (si terminé)';

-- Mettre à jour les scénarios existants avec des valeurs par défaut
UPDATE scenarios
SET transaction_fees = '{"type": "percentage", "percentage": 0, "fixed_amount": 0, "currency": "USD"}'::jsonb
WHERE transaction_fees IS NULL;

UPDATE scenarios
SET construction_status = 'in_progress'
WHERE construction_status IS NULL;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 25: FRAIS DE TRANSACTION ET STATUT CONSTRUCTION AJOUTÉS';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Modifications apportées:';
  RAISE NOTICE '  - Colonne transaction_fees (JSONB) ajoutée à scenarios';
  RAISE NOTICE '  - Colonne construction_status (TEXT) ajoutée à scenarios';
  RAISE NOTICE '  - Colonne delivery_date (DATE) ajoutée à scenarios';
  RAISE NOTICE '  - Colonne completion_year (INTEGER) ajoutée à scenarios';
  RAISE NOTICE '  - Valeurs par défaut appliquées aux scénarios existants';
  RAISE NOTICE ' ';
  RAISE NOTICE '📋 Structure transaction_fees:';
  RAISE NOTICE '  - type: "percentage" ou "fixed_amount"';
  RAISE NOTICE '  - percentage: valeur en %%';
  RAISE NOTICE '  - fixed_amount: montant fixe';
  RAISE NOTICE '  - currency: "CAD" ou "USD"';
  RAISE NOTICE ' ';
  RAISE NOTICE '📋 Statut de construction:';
  RAISE NOTICE '  - construction_status: "in_progress" ou "completed"';
  RAISE NOTICE '  - delivery_date: date de livraison (si en construction)';
  RAISE NOTICE '  - completion_year: année de fin (si terminé)';
  RAISE NOTICE ' ';
  RAISE NOTICE '📋 Champs ajoutés au promoter_data (automatique via JSONB):';
  RAISE NOTICE '  - rent_type: "monthly" ou "nightly"';
  RAISE NOTICE '  - rent_currency: "CAD" ou "USD"';
  RAISE NOTICE ' ';
  RAISE NOTICE '✓ Prêt à saisir toutes les nouvelles informations';
END $$;
