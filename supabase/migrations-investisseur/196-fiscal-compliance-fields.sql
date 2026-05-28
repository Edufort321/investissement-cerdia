-- Migration 196 : Champs conformité fiscale manquants
-- properties : valeur marchande, T1135 catégorie, 871(d), Confotur, audit
-- transactions : audit trail (created_by/updated_by), TDT Florida
-- fiscal_year_settings : revenu imposable canadien par année (T2209 plafond 15%)
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- ─────────────────────────────────────────────────────────────
-- A. TABLE properties — champs fiscaux manquants
-- ─────────────────────────────────────────────────────────────

-- Valeur marchande courante (T1135 exige juste valeur marchande, pas coût d'achat)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS current_market_value_cad NUMERIC(14,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valuation_date            DATE           DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valuation_source          VARCHAR(50)    DEFAULT NULL,
  -- 'manual' | 'appraiser' | 'tax_assessment' | 'zillow' | 'other'
  ADD COLUMN IF NOT EXISTS valuation_notes           TEXT           DEFAULT NULL;

-- T1135 catégorie (1=fonds, 2=actions, 3=dettes, 4=fiducies, 5=immobilier, 6=autres, 7=courtier)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS t1135_category            VARCHAR(2)     DEFAULT '5';

-- USA : élection Section 871(d) IRC (revenu net au lieu du brut)
-- OBLIGATOIRE pour déduire les dépenses sur revenu locatif US — sans ça = 30% sur brut
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS us_871d_election          BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS us_871d_election_date     DATE           DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS us_tax_id                 VARCHAR(20)    DEFAULT NULL,
  -- ITIN (Individual: XXX-XX-XXXX) ou EIN (Company: XX-XXXXXXX)
  ADD COLUMN IF NOT EXISTS foreign_account_number    VARCHAR(50)    DEFAULT NULL;

-- Rép. Dominicaine : Confotur (Loi 158-01 — exonération jusqu'à 15 ans)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS confotur_certification_date DATE         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confotur_expiry_date         DATE         DEFAULT NULL;

-- NR6 : élection revenu net pour non-résidents recevant loyers canadiens
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS nr6_election_active       BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nr6_election_date         DATE           DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────
-- B. TABLE transactions — audit trail + TDT Florida
-- ─────────────────────────────────────────────────────────────

-- Audit trail : qui a créé / modifié la transaction
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- TDT locale (Tourist Development Tax) — séparée de la Sales Tax d'État en Floride
-- Déclarée au comté (pas sur DR-15), taux variable 1%-6% selon comté
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS county_tdt_rate   NUMERIC(5,4) DEFAULT NULL,
  -- ex: 0.0500 = 5% (Miami-Dade)
  ADD COLUMN IF NOT EXISTS county_tdt_amount NUMERIC(12,2) DEFAULT NULL;

-- W-8 ECI status (requis annuellement pour éviter retenue 30% sur revenus US)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS w8eci_applied BOOLEAN DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────
-- C. TABLE fiscal_year_settings — paramètres T2209 par année
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fiscal_year_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  fiscal_year                INTEGER NOT NULL,
  -- Revenu imposable canadien total (pour calculer le plafond 15% T2209)
  canadian_taxable_income    NUMERIC(14,2) DEFAULT NULL,
  -- Taux marginal combiné fédéral+provincial (QC défaut ~53.3%, ON ~46.4%)
  canadian_marginal_rate     NUMERIC(5,4)  DEFAULT 0.265,
  province                   VARCHAR(2)    DEFAULT 'QC',
  -- T2209 : crédits inutilisés reportés de l'année précédente (carryforward)
  t2209_carryforward_from_prior NUMERIC(14,2) DEFAULT 0,
  notes                      TEXT          DEFAULT NULL,
  created_at                 TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(organization_id, fiscal_year)
);

ALTER TABLE fiscal_year_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_manage_fiscal_year_settings"
  ON fiscal_year_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- D. Taux TDT Florida par comté (dans tax_jurisdiction_rates)
-- ─────────────────────────────────────────────────────────────

-- Si la table tax_jurisdiction_rates existe (migration 193), ajouter comtés Florida
INSERT INTO tax_jurisdiction_rates (
  country_code, jurisdiction_code, jurisdiction_name, jurisdiction_level,
  sales_tax_rate, income_tax_rate, withholding_rate,
  filing_deadline_note, effective_date
)
SELECT * FROM (VALUES
  ('US','FL-MIAMI',   'Florida — Miami-Dade County (TDT 6%)',    'county', 0.0600, 0.0000, 0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01'),
  ('US','FL-BROWARD', 'Florida — Broward County (TDT 5%)',       'county', 0.0500, 0.0000, 0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01'),
  ('US','FL-ORANGE',  'Florida — Orange County (TDT 6%)',        'county', 0.0600, 0.0000, 0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01'),
  ('US','FL-OSCEOLA', 'Florida — Osceola County (TDT 6%)',       'county', 0.0600, 0.0000, 0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01'),
  ('US','FL-PINELLAS','Florida — Pinellas County (TDT 6%)',      'county', 0.0600, 0.0000, 0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01'),
  ('US','FL-HILLSBOROUGH','Florida — Hillsborough County (TDT 5%)','county',0.0500,0.0000,0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01'),
  ('US','FL-COLLIER', 'Florida — Collier County (TDT 5%)',       'county', 0.0500, 0.0000, 0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01'),
  ('US','FL-KEYS',    'Florida — Monroe County/Keys (TDT 5%)',   'county', 0.0500, 0.0000, 0.0000, 'TDT mensuel au comté + DR-15 État séparé', '2024-01-01')
) AS v(country_code, jurisdiction_code, jurisdiction_name, jurisdiction_level, sales_tax_rate, income_tax_rate, withholding_rate, filing_deadline_note, effective_date)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_jurisdiction_rates')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 196 OK';
  RAISE NOTICE '   properties : current_market_value_cad, valuation_date, t1135_category, us_871d_election, confotur_dates, nr6_election';
  RAISE NOTICE '   transactions : created_by, updated_by, county_tdt_rate, county_tdt_amount, w8eci_applied';
  RAISE NOTICE '   fiscal_year_settings : revenu imposable CAD + taux marginal + carryforward T2209';
  RAISE NOTICE '   tax_jurisdiction_rates : comtés Florida TDT ajoutés';
END $$;
