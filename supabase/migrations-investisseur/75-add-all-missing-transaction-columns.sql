-- ==========================================
-- AJOUT DE TOUTES LES COLONNES MANQUANTES DANS TRANSACTIONS
-- Correctif complet pour permettre l'enregistrement des transactions
-- ==========================================

-- Cette migration ajoute toutes les colonnes qui sont utilisées par le code
-- mais qui ne sont pas présentes dans la table transactions de base

-- 1. Colonnes de base pour transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'capital' CHECK (category IN ('capital', 'operation', 'maintenance', 'admin')),
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'virement' CHECK (payment_method IN ('virement', 'cheque', 'especes', 'carte')),
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'complete' CHECK (status IN ('complete', 'en_attente', 'annule'));

COMMENT ON COLUMN transactions.category IS 'Catégorie de la transaction (capital, operation, maintenance, admin)';
COMMENT ON COLUMN transactions.payment_method IS 'Méthode de paiement (virement, cheque, especes, carte)';
COMMENT ON COLUMN transactions.reference_number IS 'Numéro de référence de la transaction';
COMMENT ON COLUMN transactions.status IS 'Statut de la transaction (complete, en_attente, annule)';

-- 2. Colonnes pour fiscalité internationale (de la migration 12)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS source_currency VARCHAR(3) DEFAULT 'CAD',
ADD COLUMN IF NOT EXISTS source_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS source_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_fees DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS foreign_tax_paid DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS foreign_tax_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_credit_claimable DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fiscal_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS accountant_notes TEXT;

COMMENT ON COLUMN transactions.source_currency IS 'Devise d''origine (USD, DOP, EUR, etc.)';
COMMENT ON COLUMN transactions.source_amount IS 'Montant dans la devise source';
COMMENT ON COLUMN transactions.exchange_rate IS 'Taux de change vers CAD à la date de transaction';
COMMENT ON COLUMN transactions.source_country IS 'Pays d''origine de la transaction';
COMMENT ON COLUMN transactions.bank_fees IS 'Frais bancaires et frais de conversion (en CAD)';
COMMENT ON COLUMN transactions.foreign_tax_paid IS 'Impôt payé à l''étranger (en CAD)';
COMMENT ON COLUMN transactions.foreign_tax_rate IS 'Taux d''imposition étranger (%)';
COMMENT ON COLUMN transactions.tax_credit_claimable IS 'Crédit d''impôt étranger réclamable au Canada';
COMMENT ON COLUMN transactions.fiscal_category IS 'Catégorie fiscale: rental_income, management_fee, capex, opex, etc.';
COMMENT ON COLUMN transactions.vendor_name IS 'Nom du fournisseur ou de la compagnie';
COMMENT ON COLUMN transactions.accountant_notes IS 'Notes pour le comptable';

-- 3. Colonnes pour liaison avec paiements programmés (de la migration 15)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_schedule_id UUID REFERENCES payment_schedules(id) ON DELETE SET NULL;

COMMENT ON COLUMN transactions.payment_schedule_id IS 'Lien vers le paiement programmé si cette transaction correspond à un versement';

CREATE INDEX IF NOT EXISTS idx_transactions_payment_schedule_id ON transactions(payment_schedule_id);

-- 4. Colonne pour statut paiement complet/partiel (de la migration 018)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_completion_status TEXT CHECK (payment_completion_status IN ('full', 'partial'));

COMMENT ON COLUMN transactions.payment_completion_status IS 'Indique si ce paiement est complet (full) ou partiel (partial). Si full, le payment_schedule sera marqué comme paid.';

-- 5. Colonnes pour pièces jointes (de la migration 70)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_storage_path TEXT,
ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_size BIGINT,
ADD COLUMN IF NOT EXISTS attachment_uploaded_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN transactions.attachment_name IS 'Nom du fichier joint (si un seul fichier)';
COMMENT ON COLUMN transactions.attachment_url IS 'URL publique du fichier joint';
COMMENT ON COLUMN transactions.attachment_storage_path IS 'Chemin de stockage Supabase';
COMMENT ON COLUMN transactions.attachment_mime_type IS 'Type MIME du fichier';
COMMENT ON COLUMN transactions.attachment_size IS 'Taille du fichier en octets';
COMMENT ON COLUMN transactions.attachment_uploaded_at IS 'Date et heure de téléchargement';

-- Vérification finale
DO $$
DECLARE
  v_missing_columns TEXT[];
  v_expected_columns TEXT[] := ARRAY[
    'category', 'payment_method', 'reference_number', 'status',
    'source_currency', 'source_amount', 'exchange_rate', 'source_country',
    'bank_fees', 'foreign_tax_paid', 'foreign_tax_rate', 'tax_credit_claimable',
    'fiscal_category', 'vendor_name', 'accountant_notes',
    'payment_schedule_id', 'payment_completion_status',
    'attachment_name', 'attachment_url', 'attachment_storage_path',
    'attachment_mime_type', 'attachment_size', 'attachment_uploaded_at'
  ];
  v_col TEXT;
BEGIN
  -- Vérifier chaque colonne attendue
  FOREACH v_col IN ARRAY v_expected_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      AND column_name = v_col
    ) THEN
      v_missing_columns := array_append(v_missing_columns, v_col);
    END IF;
  END LOOP;

  -- Afficher le résultat
  IF array_length(v_missing_columns, 1) IS NULL THEN
    RAISE NOTICE '✅ Toutes les colonnes requises sont présentes dans la table transactions';
  ELSE
    RAISE EXCEPTION '❌ Colonnes manquantes: %', array_to_string(v_missing_columns, ', ');
  END IF;
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 75 TERMINÉE' as status,
  'Table transactions mise à jour avec toutes les colonnes requises' as message,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'transactions';
