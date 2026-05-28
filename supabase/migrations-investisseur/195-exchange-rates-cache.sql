-- Migration 195 : Enrichissement taux de change + moyennes annuelles BdC
-- La table exchange_rates existe déjà (migration 14) avec currency_from/currency_to
-- On ajoute : seed données historiques + nouvelle table exchange_rates_annual
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- ─────────────────────────────────────────────────────────────
-- A. Seed taux journaliers dans la table existante exchange_rates
-- (colonnes : currency_from, currency_to, rate, rate_date, source)
-- ─────────────────────────────────────────────────────────────

-- Taux spot récents USD→CAD (Banque du Canada)
INSERT INTO exchange_rates (currency_from, currency_to, rate, rate_date, source)
VALUES
  ('USD', 'CAD', 1.3950, '2025-05-01', 'bank_of_canada'),
  ('USD', 'CAD', 1.3900, '2025-04-01', 'bank_of_canada'),
  ('USD', 'CAD', 1.4400, '2025-01-01', 'bank_of_canada'),
  ('USD', 'CAD', 1.3601, '2024-12-31', 'bank_of_canada'),
  ('USD', 'CAD', 1.3400, '2024-06-30', 'bank_of_canada'),
  ('USD', 'CAD', 1.3497, '2023-12-31', 'bank_of_canada'),
  ('USD', 'CAD', 1.3013, '2022-12-31', 'bank_of_canada'),
  ('USD', 'CAD', 1.2535, '2021-12-31', 'bank_of_canada'),
  ('EUR', 'CAD', 1.5400, '2025-05-01', 'bank_of_canada'),
  ('EUR', 'CAD', 1.4779, '2024-12-31', 'bank_of_canada'),
  ('EUR', 'CAD', 1.4641, '2023-12-31', 'bank_of_canada'),
  ('DOP', 'CAD', 0.02380,'2025-05-01', 'usd_cross'),
  ('DOP', 'CAD', 0.02320,'2024-12-31', 'usd_cross'),
  ('DOP', 'CAD', 0.02440,'2023-12-31', 'usd_cross'),
  ('MXN', 'CAD', 0.06890,'2025-05-01', 'bank_of_canada'),
  ('MXN', 'CAD', 0.07825,'2024-12-31', 'bank_of_canada')
ON CONFLICT (currency_from, currency_to, rate_date) DO UPDATE
  SET rate = EXCLUDED.rate, source = EXCLUDED.source;

-- ─────────────────────────────────────────────────────────────
-- B. Nouvelle table : exchange_rates_annual
-- Moyennes annuelles officielles BdC (règle ARC pour T1135/T2209)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_rates_annual (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INTEGER     NOT NULL,
  currency_from   VARCHAR(3)  NOT NULL,
  currency_to     VARCHAR(3)  NOT NULL DEFAULT 'CAD',
  annual_avg_rate NUMERIC(12,6) NOT NULL,
  source          VARCHAR(50) DEFAULT 'bank_of_canada',
  notes           TEXT        DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, currency_from, currency_to)
);

CREATE INDEX IF NOT EXISTS idx_exch_annual_year ON exchange_rates_annual(year DESC, currency_from);

ALTER TABLE exchange_rates_annual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_exchange_rates_annual"
  ON exchange_rates_annual FOR SELECT USING (true);

CREATE POLICY "auth_write_exchange_rates_annual"
  ON exchange_rates_annual FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Seed moyennes annuelles officielles
-- Source : https://www.banqueducanada.ca/taux/taux-de-change/taux-de-change-moyens-annuels/
INSERT INTO exchange_rates_annual (year, currency_from, annual_avg_rate, source, notes) VALUES
  -- USD → CAD
  (2025, 'USD', 1.3950, 'bank_of_canada_estimate', 'Estimation partielle jan-mai 2025'),
  (2024, 'USD', 1.3601, 'bank_of_canada', 'Officiel BdC 2024'),
  (2023, 'USD', 1.3497, 'bank_of_canada', 'Officiel BdC 2023'),
  (2022, 'USD', 1.3013, 'bank_of_canada', 'Officiel BdC 2022'),
  (2021, 'USD', 1.2535, 'bank_of_canada', 'Officiel BdC 2021'),
  (2020, 'USD', 1.3415, 'bank_of_canada', 'Officiel BdC 2020'),
  -- EUR → CAD
  (2025, 'EUR', 1.5400, 'bank_of_canada_estimate', 'Estimation partielle jan-mai 2025'),
  (2024, 'EUR', 1.4779, 'bank_of_canada', 'Officiel BdC 2024'),
  (2023, 'EUR', 1.4641, 'bank_of_canada', 'Officiel BdC 2023'),
  (2022, 'EUR', 1.3694, 'bank_of_canada', 'Officiel BdC 2022'),
  (2021, 'EUR', 1.4841, 'bank_of_canada', 'Officiel BdC 2021'),
  (2020, 'EUR', 1.5303, 'bank_of_canada', 'Officiel BdC 2020'),
  -- DOP → CAD (Peso dominicain — non publié BdC, calculé via croisement USD)
  (2025, 'DOP', 0.023800, 'usd_cross_estimate', 'Calculé : DOP/USD × USD/CAD'),
  (2024, 'DOP', 0.023200, 'usd_cross', 'Calculé : DOP/USD × USD/CAD'),
  (2023, 'DOP', 0.024400, 'usd_cross', 'Calculé : DOP/USD × USD/CAD'),
  (2022, 'DOP', 0.023900, 'usd_cross', 'Calculé : DOP/USD × USD/CAD'),
  (2021, 'DOP', 0.021800, 'usd_cross', 'Calculé : DOP/USD × USD/CAD'),
  (2020, 'DOP', 0.023400, 'usd_cross', 'Calculé : DOP/USD × USD/CAD'),
  -- MXN → CAD (Peso mexicain)
  (2025, 'MXN', 0.068900, 'bank_of_canada_estimate', 'Estimation partielle jan-mai 2025'),
  (2024, 'MXN', 0.078250, 'bank_of_canada', 'Officiel BdC 2024'),
  (2023, 'MXN', 0.078200, 'bank_of_canada', 'Officiel BdC 2023'),
  (2022, 'MXN', 0.065500, 'bank_of_canada', 'Officiel BdC 2022'),
  (2021, 'MXN', 0.062600, 'bank_of_canada', 'Officiel BdC 2021'),
  (2020, 'MXN', 0.059800, 'bank_of_canada', 'Officiel BdC 2020')
ON CONFLICT (year, currency_from, currency_to) DO UPDATE
  SET annual_avg_rate = EXCLUDED.annual_avg_rate,
      source = EXCLUDED.source,
      notes = EXCLUDED.notes;

-- ─────────────────────────────────────────────────────────────
-- C. Fonction utilitaire SQL : taux annuel moyen
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_annual_rate(p_currency VARCHAR, p_year INTEGER)
RETURNS NUMERIC AS $$
DECLARE v_rate NUMERIC;
BEGIN
  -- Cherche d'abord dans exchange_rates_annual
  SELECT annual_avg_rate INTO v_rate
  FROM exchange_rates_annual
  WHERE currency_from = p_currency AND year = p_year AND currency_to = 'CAD';

  IF v_rate IS NULL THEN
    -- Fallback : taux spot le plus proche en fin d'année dans exchange_rates
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE currency_from = p_currency AND currency_to = 'CAD'
      AND rate_date BETWEEN (p_year || '-01-01')::DATE AND (p_year || '-12-31')::DATE
    ORDER BY rate_date DESC
    LIMIT 1;
  END IF;

  IF v_rate IS NULL THEN
    -- Fallback ultime : année la plus proche dans exchange_rates_annual
    SELECT annual_avg_rate INTO v_rate
    FROM exchange_rates_annual
    WHERE currency_from = p_currency AND currency_to = 'CAD'
    ORDER BY ABS(year - p_year) ASC
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_rate, CASE p_currency WHEN 'USD' THEN 1.35 WHEN 'EUR' THEN 1.47 WHEN 'DOP' THEN 0.023 ELSE 1.0 END);
END;
$$ LANGUAGE plpgsql STABLE;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 195 OK';
  RAISE NOTICE '   exchange_rates : taux journaliers seedés (colonnes currency_from/currency_to existantes)';
  RAISE NOTICE '   exchange_rates_annual : table créée + moyennes BdC 2020-2025 USD/EUR/DOP/MXN';
  RAISE NOTICE '   get_annual_rate(currency, year) : fonction helper SQL';
END $$;
