-- Migration 200 : IRNR RD, sauvegarde TDT, colonnes W-8ECI/IRNR
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- ─────────────────────────────────────────────────────────────
-- A. Colonne irnr_amount sur transactions (RD — retenue 27%)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS irnr_amount NUMERIC(12,2) DEFAULT NULL;
  -- Montant IRNR retenu (Impuesto sobre la Renta No Residentes — 27% RD)

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS irnr_rate NUMERIC(5,2) DEFAULT NULL;
  -- Taux IRNR (défaut 27% non-résidents RD)

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS county_tdt_rate NUMERIC(5,2) DEFAULT NULL;
  -- Taux TDT comté Florida (5 ou 6%)
  -- county_tdt_amount déjà existant (migration 196)

-- ─────────────────────────────────────────────────────────────
-- B. Colonnes W-8 sur properties
-- ─────────────────────────────────────────────────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS w8ben_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS w8ben_submission_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS w8eci_submission_date DATE DEFAULT NULL;
  -- w8eci_applied déjà existant (migration 196)

-- ─────────────────────────────────────────────────────────────
-- C. Colonnes T2209 carryback sur fiscal_year_settings
-- ─────────────────────────────────────────────────────────────
ALTER TABLE fiscal_year_settings
  ADD COLUMN IF NOT EXISTS t2209_credit_eligible NUMERIC(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS t2209_credit_used NUMERIC(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS t2209_carryforward_remaining NUMERIC(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS t2209_carryback_year INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS t2209_carryback_amount NUMERIC(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS t1_adj_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS t1_adj_submission_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS t1_adj_reference VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS filing_status VARCHAR(20) DEFAULT 'draft';
  -- 'draft' | 'filed' | 'assessed'

-- ─────────────────────────────────────────────────────────────
-- D. IRNR dans tax_jurisdiction_rates (si pas encore seedé)
-- ─────────────────────────────────────────────────────────────
INSERT INTO tax_jurisdiction_rates (
  country_code, jurisdiction_level, jurisdiction_code, jurisdiction_name,
  income_tax_rate, withholding_rate_nr, filing_deadline_note, effective_date
)
SELECT * FROM (VALUES
  ('DO', 'federal', 'DO-IRNR', 'République Dominicaine — IRNR Non-Résidents (27%)',
   27.0::NUMERIC, 27.0::NUMERIC,
   'Retenue mensuelle par le locataire. Déclaration IR2 annuelle à la DGII. Taux 27% sur revenus bruts locatifs pour non-résidents.',
   '2024-01-01'::DATE)
) AS v(country_code, jurisdiction_level, jurisdiction_code, jurisdiction_name, income_tax_rate, withholding_rate_nr, filing_deadline_note, effective_date)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tax_jurisdiction_rates')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 200 OK';
  RAISE NOTICE '   transactions : irnr_amount, irnr_rate, county_tdt_rate ajoutés';
  RAISE NOTICE '   properties : w8ben_submitted, w8ben_submission_date, w8eci_submission_date ajoutés';
  RAISE NOTICE '   fiscal_year_settings : colonnes T2209 carryback ajoutées';
  RAISE NOTICE '   tax_jurisdiction_rates : IRNR RD 27 pct seedé';
END $$;
