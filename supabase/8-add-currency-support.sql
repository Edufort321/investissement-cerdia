-- ==========================================
-- AJOUT SUPPORT MULTI-DEVISES
-- CAD pour investissements, USD pour propriétés
-- ==========================================

-- Étape 1: Ajouter colonne currency aux transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Étape 2: Mettre à jour les transactions existantes selon le type
-- Investissements et dividendes = CAD
-- Paiements et dépenses = USD
UPDATE transactions
SET currency = CASE
  WHEN type IN ('investissement', 'dividende') THEN 'CAD'
  ELSE 'USD'
END;

-- Étape 3: Ajouter une colonne pour le taux de change USD/CAD
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4) DEFAULT 1.35;

-- Par défaut, 1 CAD = 1.35 USD (ajustable)

-- Étape 4: Créer une table pour gérer les taux de change
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10, 4) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer le taux de change actuel
INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date)
VALUES ('CAD', 'USD', 0.74, CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date)
VALUES ('USD', 'CAD', 1.35, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Étape 5: Ajouter currency aux propriétés (toujours USD)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Étape 6: Ajouter currency aux investisseurs (toujours CAD pour total_invested)
ALTER TABLE investors
ADD COLUMN IF NOT EXISTS investment_currency VARCHAR(3) DEFAULT 'CAD';

-- Étape 7: Créer une vue pour les totaux par devise
CREATE OR REPLACE VIEW transaction_summary AS
SELECT
  currency,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
WHERE status = 'complete'
GROUP BY currency, type;

-- Vérification
SELECT
  '✅ CONFIGURATION MULTI-DEVISES' as status,
  'CAD pour investissements, USD pour propriétés' as note;

SELECT * FROM transaction_summary;
