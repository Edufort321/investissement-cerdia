-- Migration 199 : T2209 Carryback — Historique crédits impôt étranger
-- Permet de suivre le report rétrospectif (carryback 3 ans) des crédits T2209
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- ─────────────────────────────────────────────────────────────
-- A. TABLE foreign_tax_credit_history — Une ligne par année fiscale
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foreign_tax_credit_history (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  fiscal_year              INTEGER NOT NULL,

  -- Revenus étrangers nets (base de calcul T2209)
  foreign_income_cad       NUMERIC(14,2) DEFAULT 0,  -- Revenu étranger converti en CAD
  foreign_income_usd       NUMERIC(14,2) DEFAULT 0,  -- Source USD (référence)
  foreign_income_dop       NUMERIC(14,2) DEFAULT 0,  -- Source DOP (référence)

  -- Impôts étrangers payés
  foreign_tax_paid_cad     NUMERIC(14,2) DEFAULT 0,  -- Total impôts étrangers (CAD)
  foreign_tax_paid_usd     NUMERIC(14,2) DEFAULT 0,
  foreign_tax_paid_dop     NUMERIC(14,2) DEFAULT 0,

  -- Crédit T2209 accordé (plafonné à 15% du revenu net étranger)
  t2209_credit_eligible    NUMERIC(14,2) DEFAULT 0,  -- Min(impôt_étranger, 15% × revenu_étranger)
  t2209_credit_used        NUMERIC(14,2) DEFAULT 0,  -- Crédit effectivement utilisé vs impôt canadien dû
  t2209_credit_unused      NUMERIC(14,2) DEFAULT 0,  -- Solde non utilisé (= éligible - utilisé)

  -- Carryforward (report prospectif — non limité en années pour T2209 fédéral)
  carryforward_from_prior  NUMERIC(14,2) DEFAULT 0,  -- Crédits reportés d'années antérieures utilisés cette année
  carryforward_remaining   NUMERIC(14,2) DEFAULT 0,  -- Crédits non utilisés reportés aux années suivantes

  -- Carryback (report rétrospectif — 3 ans en arrière, formulaire T1-ADJ)
  -- Indique si ce crédit a été appliqué à une année antérieure via T1-ADJ
  carryback_applied_year   INTEGER DEFAULT NULL,      -- Année à laquelle ce crédit a été reporté en arrière
  carryback_amount         NUMERIC(14,2) DEFAULT 0,  -- Montant reporté en arrière
  t1_adj_submitted         BOOLEAN DEFAULT FALSE,     -- Formulaire T1-ADJ soumis à l'ARC
  t1_adj_submission_date   DATE DEFAULT NULL,
  t1_adj_reference         VARCHAR(50) DEFAULT NULL,  -- Numéro de référence ARC

  -- Ventilation par pays source
  breakdown_by_country     JSONB DEFAULT NULL,
  -- Ex: [{"country":"US","income":15000,"tax_paid":2250},{"country":"DO","income":8000,"tax_paid":1440}]

  -- Province (crédit provincial supplémentaire possible selon province)
  province_code            VARCHAR(2) DEFAULT 'QC',
  provincial_credit_used   NUMERIC(14,2) DEFAULT 0,

  -- Source et notes
  source                   VARCHAR(20) DEFAULT 'calculated',
  -- 'calculated' | 'manual' | 'cpa_filed'
  cpa_notes                TEXT DEFAULT NULL,
  filing_status            VARCHAR(20) DEFAULT 'draft',
  -- 'draft' | 'filed' | 'assessed' | 'reassessed'
  assessed_date            DATE DEFAULT NULL,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_ftch_org_year ON foreign_tax_credit_history(organization_id, fiscal_year DESC);

ALTER TABLE foreign_tax_credit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_manage_ftch"
  ON foreign_tax_credit_history FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- B. Fonction SQL : calculer T2209 estimé depuis les transactions
-- ─────────────────────────────────────────────────────────────
-- Usage : SELECT * FROM calculate_t2209_estimate(org_id, fiscal_year)
CREATE OR REPLACE FUNCTION calculate_t2209_estimate(
  p_org_id    UUID,
  p_year      INTEGER DEFAULT NULL
)
RETURNS TABLE(
  fiscal_year              INTEGER,
  foreign_income_cad       NUMERIC,
  foreign_tax_paid_cad     NUMERIC,
  t2209_credit_eligible    NUMERIC,
  breakdown_by_country     JSONB
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
BEGIN
  RETURN QUERY
  SELECT
    v_year AS fiscal_year,
    COALESCE(SUM(CASE WHEN t.source_currency IN ('USD','DOP','EUR','MXN') THEN t.amount ELSE 0 END), 0) AS foreign_income_cad,
    COALESCE(SUM(t.foreign_tax_paid), 0) AS foreign_tax_paid_cad,
    -- Plafond T2209 : 15% du revenu étranger net
    LEAST(
      COALESCE(SUM(t.foreign_tax_paid), 0),
      COALESCE(SUM(CASE WHEN t.source_currency IN ('USD','DOP','EUR','MXN') THEN t.amount ELSE 0 END), 0) * 0.15
    ) AS t2209_credit_eligible,
    -- Ventilation par pays
    jsonb_agg(DISTINCT jsonb_build_object(
      'country', COALESCE(t.source_country, t.source_currency),
      'income_cad', t.amount,
      'tax_paid', t.foreign_tax_paid
    )) FILTER (WHERE t.source_currency IS NOT NULL AND t.source_currency <> 'CAD') AS breakdown_by_country
  FROM transactions t
  JOIN properties p ON p.id = t.property_id
  WHERE p.organization_id = p_org_id
    AND EXTRACT(YEAR FROM t.date)::INTEGER = v_year
    AND t.foreign_tax_paid > 0;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- C. Colonnes supplémentaires sur transactions (piste audit T2209)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS t2209_carryback_year INTEGER DEFAULT NULL;
  -- Si ce crédit a été reporté en arrière, l'année cible

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 199 OK';
  RAISE NOTICE '   foreign_tax_credit_history : table T2209 par année créée';
  RAISE NOTICE '   calculate_t2209_estimate(org_id, year) : fonction SQL';
  RAISE NOTICE '   transactions.t2209_carryback_year : colonne piste audit';
END $$;
