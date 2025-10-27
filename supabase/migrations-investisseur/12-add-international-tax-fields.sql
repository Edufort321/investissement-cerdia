-- ==========================================
-- GESTION FISCALE INTERNATIONALE
-- Ajout champs pour revenus étrangers et conformité ARC
-- ==========================================

-- Étape 1: Ajouter colonnes fiscales internationales à transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS source_currency VARCHAR(3) DEFAULT 'CAD',
ADD COLUMN IF NOT EXISTS source_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS source_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS foreign_tax_paid DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS foreign_tax_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_credit_claimable DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fiscal_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_receipt_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS accountant_notes TEXT;

COMMENT ON COLUMN transactions.source_currency IS 'Devise d''origine (USD, DOP, EUR, etc.)';
COMMENT ON COLUMN transactions.source_amount IS 'Montant dans la devise source';
COMMENT ON COLUMN transactions.exchange_rate IS 'Taux de change vers CAD à la date de transaction';
COMMENT ON COLUMN transactions.source_country IS 'Pays d''origine de la transaction';
COMMENT ON COLUMN transactions.foreign_tax_paid IS 'Impôt payé à l''étranger (en CAD)';
COMMENT ON COLUMN transactions.foreign_tax_rate IS 'Taux d''imposition étranger (%)';
COMMENT ON COLUMN transactions.tax_credit_claimable IS 'Crédit d''impôt étranger réclamable au Canada';
COMMENT ON COLUMN transactions.fiscal_category IS 'Catégorie fiscale: rental_income, management_fee, capex, opex, etc.';
COMMENT ON COLUMN transactions.vendor_name IS 'Nom du fournisseur ou de la compagnie';
COMMENT ON COLUMN transactions.tax_receipt_path IS 'Chemin vers le reçu fiscal dans storage';
COMMENT ON COLUMN transactions.accountant_notes IS 'Notes pour le comptable';

-- Étape 2: Créer table pour pièces jointes multiples par transaction
CREATE TABLE IF NOT EXISTS transaction_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  storage_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction ON transaction_attachments(transaction_id);

COMMENT ON TABLE transaction_attachments IS 'Pièces jointes pour chaque transaction (factures, reçus fiscaux, contrats, etc.)';

-- Étape 3: Vue pour rapport T1135 (Bilan de vérification du revenu étranger)
CREATE OR REPLACE VIEW foreign_income_report AS
SELECT
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  t.source_country,
  t.source_currency,
  p.name as property_name,
  p.location,
  SUM(t.source_amount) as total_foreign_amount,
  SUM(t.amount) as total_cad_amount,
  SUM(t.foreign_tax_paid) as total_foreign_tax,
  SUM(t.tax_credit_claimable) as total_tax_credit,
  COUNT(*) as transaction_count
FROM transactions t
LEFT JOIN properties p ON p.id = t.property_id
WHERE t.source_country IS NOT NULL
  AND t.source_country != 'Canada'
GROUP BY EXTRACT(YEAR FROM t.date), t.source_country, t.source_currency, p.name, p.location
ORDER BY year DESC, t.source_country;

COMMENT ON VIEW foreign_income_report IS 'Rapport des revenus étrangers pour formulaire T1135 de l''ARC';

-- Étape 4: Vue pour rapport T2209 (Crédits fédéraux pour impôt étranger)
CREATE OR REPLACE VIEW foreign_tax_credit_report AS
SELECT
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  t.source_country,
  t.fiscal_category,
  SUM(t.amount) as total_foreign_income_cad,
  SUM(t.foreign_tax_paid) as total_foreign_tax_paid,
  SUM(t.tax_credit_claimable) as total_tax_credit_claimable,
  AVG(t.foreign_tax_rate) as avg_foreign_tax_rate
FROM transactions t
WHERE t.foreign_tax_paid > 0
GROUP BY EXTRACT(YEAR FROM t.date), t.source_country, t.fiscal_category
ORDER BY year DESC, t.source_country;

COMMENT ON VIEW foreign_tax_credit_report IS 'Rapport des crédits d''impôt étranger pour formulaire T2209';

-- Étape 5: Vue pour rapport gains/pertes de change
CREATE OR REPLACE VIEW currency_gains_losses AS
SELECT
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  EXTRACT(MONTH FROM t.date)::INTEGER as month,
  t.source_currency,
  SUM(t.source_amount) as total_source_amount,
  SUM(t.amount) as total_cad_converted,
  AVG(t.exchange_rate) as avg_exchange_rate,
  -- Calcul gain/perte théorique (simplifié)
  SUM(t.amount - (t.source_amount * t.exchange_rate)) as currency_variance
FROM transactions t
WHERE t.source_currency IS NOT NULL
  AND t.source_currency != 'CAD'
GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date), t.source_currency
ORDER BY year DESC, month DESC, t.source_currency;

COMMENT ON VIEW currency_gains_losses IS 'Rapport des gains/pertes de change pour déclaration fiscale';

-- Étape 6: Fonction pour calculer automatiquement le crédit d'impôt réclamable
CREATE OR REPLACE FUNCTION calculate_foreign_tax_credit(
  p_foreign_income_cad DECIMAL(12, 2),
  p_foreign_tax_paid DECIMAL(12, 2),
  p_canadian_tax_rate DECIMAL(5, 2) DEFAULT 26.5
) RETURNS DECIMAL(12, 2) AS $$
DECLARE
  v_max_credit_based_on_income DECIMAL(12, 2);
  v_actual_credit DECIMAL(12, 2);
BEGIN
  -- Le crédit ne peut pas dépasser l'impôt canadien qui aurait été payé sur ce revenu
  v_max_credit_based_on_income := p_foreign_income_cad * (p_canadian_tax_rate / 100);

  -- Le crédit est le moindre de: impôt étranger payé OU impôt canadien théorique
  v_actual_credit := LEAST(p_foreign_tax_paid, v_max_credit_based_on_income);

  RETURN v_actual_credit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_foreign_tax_credit IS 'Calcule le crédit d''impôt étranger réclamable selon les règles de l''ARC';

-- Étape 7: Trigger pour calculer automatiquement le crédit d'impôt
CREATE OR REPLACE FUNCTION trigger_calculate_tax_credit()
RETURNS TRIGGER AS $$
BEGIN
  -- Si de l'impôt étranger a été payé, calculer le crédit réclamable
  IF NEW.foreign_tax_paid > 0 AND NEW.amount > 0 THEN
    NEW.tax_credit_claimable := calculate_foreign_tax_credit(
      NEW.amount,
      NEW.foreign_tax_paid,
      26.5 -- Taux marginal par défaut, peut être ajusté
    );
  ELSE
    NEW.tax_credit_claimable := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_tax_credit
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_tax_credit();

-- Étape 8: Vue pour rapport comptable complet par projet
CREATE OR REPLACE VIEW accounting_report_by_project AS
SELECT
  p.id as property_id,
  p.name as property_name,
  p.location,
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  EXTRACT(MONTH FROM t.date)::INTEGER as month,

  -- Revenus
  SUM(CASE WHEN t.operation_type = 'revenu' THEN t.amount ELSE 0 END) as total_revenue_cad,
  SUM(CASE WHEN t.operation_type = 'revenu' AND t.source_currency != 'CAD' THEN t.amount ELSE 0 END) as foreign_revenue_cad,

  -- OPEX (Coûts d'exploitation)
  SUM(CASE WHEN t.operation_type = 'cout_operation' THEN t.amount ELSE 0 END) as total_opex,

  -- CAPEX (Dépenses en capital)
  SUM(CASE WHEN t.operation_type = 'depense_projet' THEN t.amount ELSE 0 END) as total_capex,

  -- Fiscalité
  SUM(t.foreign_tax_paid) as total_foreign_tax,
  SUM(t.tax_credit_claimable) as total_tax_credits,

  -- Revenu net
  SUM(CASE WHEN t.operation_type = 'revenu' THEN t.amount ELSE 0 END) -
  SUM(CASE WHEN t.operation_type = 'cout_operation' THEN t.amount ELSE 0 END) as net_operating_income,

  -- Nombre de transactions
  COUNT(*) as transaction_count

FROM properties p
LEFT JOIN transactions t ON t.property_id = p.id
GROUP BY p.id, p.name, p.location, EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
ORDER BY year DESC, month DESC, p.name;

COMMENT ON VIEW accounting_report_by_project IS 'Rapport comptable complet par projet avec OPEX, CAPEX et fiscalité étrangère';

-- Étape 9: RLS pour transaction_attachments
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout voir
CREATE POLICY "Admin peut tout voir sur transaction_attachments"
ON transaction_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- Admins peuvent tout modifier
CREATE POLICY "Admin peut tout modifier sur transaction_attachments"
ON transaction_attachments FOR ALL
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
  '✅ SYSTÈME DE GESTION FISCALE INTERNATIONALE CRÉÉ' as status,
  'Colonnes ajoutées: source_currency, source_amount, exchange_rate, foreign_tax_paid, etc.' as transactions_updates,
  'Table: transaction_attachments' as new_tables,
  'Vues: foreign_income_report, foreign_tax_credit_report, currency_gains_losses, accounting_report_by_project' as views,
  'Fonction: calculate_foreign_tax_credit' as functions,
  'Triggers: Auto-calcul crédit impôt étranger' as triggers;

-- Exemples d'utilisation:
COMMENT ON TABLE transactions IS '
Système de gestion fiscale internationale - Exemples:

1. Ajouter un revenu locatif de République Dominicaine:
   INSERT INTO transactions (
     date, type, amount, description, property_id,
     source_currency, source_amount, exchange_rate, source_country,
     foreign_tax_paid, foreign_tax_rate, fiscal_category,
     operation_type
   ) VALUES (
     ''2025-01-15'', ''dividende'', 4725.00, ''Loyer janvier 2025'', ''property-uuid'',
     ''USD'', 3500.00, 1.35, ''République Dominicaine'',
     350.00, 10.0, ''rental_income'',
     ''revenu''
   );
   -- Le crédit d''impôt est calculé automatiquement!

2. Voir rapport T1135 (revenus étrangers):
   SELECT * FROM foreign_income_report WHERE year = 2025;

3. Voir rapport T2209 (crédits impôt étranger):
   SELECT * FROM foreign_tax_credit_report WHERE year = 2025;

4. Voir gains/pertes de change:
   SELECT * FROM currency_gains_losses WHERE year = 2025;

5. Rapport comptable complet par projet:
   SELECT * FROM accounting_report_by_project
   WHERE year = 2025 AND month = 1;
';
