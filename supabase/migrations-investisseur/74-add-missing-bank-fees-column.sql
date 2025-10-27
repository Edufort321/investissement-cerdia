-- ==========================================
-- AJOUT COLONNE BANK_FEES MANQUANTE
-- Correctif pour permettre l'enregistrement des transactions
-- ==========================================

-- La colonne bank_fees est utilisée par le formulaire mais n'existe pas en base
-- Cela cause l'erreur: "Could not find the 'bank_fees' column of 'transactions'"

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS bank_fees DECIMAL(12, 2) DEFAULT 0;

COMMENT ON COLUMN transactions.bank_fees IS 'Frais bancaires et frais de conversion de devises (en CAD)';

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transactions'
    AND column_name = 'bank_fees'
  ) THEN
    RAISE NOTICE '✅ Colonne bank_fees ajoutée avec succès';
  ELSE
    RAISE EXCEPTION '❌ Échec de l''ajout de la colonne bank_fees';
  END IF;
END $$;

-- Note: Cette colonne devrait normalement faire partie de la migration 12-add-international-tax-fields.sql
-- mais elle était manquante, d'où ce correctif
