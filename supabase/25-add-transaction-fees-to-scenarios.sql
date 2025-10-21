-- =====================================================
-- SCRIPT 25: AJOUT FRAIS DE TRANSACTION AUX SCÉNARIOS
-- =====================================================
-- Description: Ajoute le champ transaction_fees (type % ou montant fixe avec devise)
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- Ajouter la colonne transaction_fees (JSONB)
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS transaction_fees JSONB DEFAULT '{"type": "percentage", "percentage": 0, "fixed_amount": 0, "currency": "USD"}'::jsonb;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN scenarios.transaction_fees IS 'Frais de transaction - Structure: {"type": "percentage|fixed_amount", "percentage": number, "fixed_amount": number, "currency": "CAD|USD"}';

-- Mettre à jour les scénarios existants avec une valeur par défaut
UPDATE scenarios
SET transaction_fees = '{"type": "percentage", "percentage": 0, "fixed_amount": 0, "currency": "USD"}'::jsonb
WHERE transaction_fees IS NULL;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 25: FRAIS DE TRANSACTION AJOUTÉS AUX SCÉNARIOS';
  RAISE NOTICE '';
  RAISE NOTICE 'Modifications apportées:';
  RAISE NOTICE '  - Colonne transaction_fees (JSONB) ajoutée à scenarios';
  RAISE NOTICE '  - Valeurs par défaut appliquées aux scénarios existants';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Structure transaction_fees:';
  RAISE NOTICE '  - type: "percentage" ou "fixed_amount"';
  RAISE NOTICE '  - percentage: valeur en %';
  RAISE NOTICE '  - fixed_amount: montant fixe';
  RAISE NOTICE '  - currency: "CAD" ou "USD"';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Champs ajoutés au promoter_data (automatique via JSONB):';
  RAISE NOTICE '  - rent_type: "monthly" ou "nightly"';
  RAISE NOTICE '  - rent_currency: "CAD" ou "USD"';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Prêt à saisir les frais de transaction et types de loyer';
END $$;
