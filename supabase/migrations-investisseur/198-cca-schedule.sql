-- Migration 198 : FNACC / CCA — Tableau d'amortissement fiscal
-- Déduction pour amortissement (Canada) + Depreciation Schedule (USA)
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- ─────────────────────────────────────────────────────────────
-- A. TABLE cca_schedule — Historique FNACC par propriété et par année
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cca_schedule (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  property_id             UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,

  fiscal_year             INTEGER NOT NULL,

  -- Classification fiscale
  cca_class               VARCHAR(8) NOT NULL DEFAULT 'Class1',
  -- Canada : Class1=4% bâtiment, Class8=20% ameublement, Class13=court terme
  -- USA    : 27.5y résidentiel (3.636%/an), 39y commercial (2.564%/an)

  -- Valeurs de l'année
  ucc_open                NUMERIC(14,2) DEFAULT 0,    -- FNACC début d'année
  additions               NUMERIC(14,2) DEFAULT 0,    -- Acquisitions dans l'année
  disposals               NUMERIC(14,2) DEFAULT 0,    -- Dispositions (ventes)
  half_year_rule_applied  BOOLEAN DEFAULT TRUE,        -- Règle de la demi-année (Canada)
  cca_rate                NUMERIC(6,4) NOT NULL,       -- Taux décroissant (ex: 0.04 = 4%)
  cca_deducted            NUMERIC(14,2) DEFAULT 0,     -- DPA/CCA déduit cette année
  ucc_close               NUMERIC(14,2) DEFAULT 0,     -- FNACC fin d'année

  -- Ventilation (bâtiment vs terrain — terrain n'est PAS amortissable)
  land_allocation_pct     NUMERIC(5,2) DEFAULT 20,     -- % attribué au terrain
  building_cost           NUMERIC(14,2) DEFAULT NULL,  -- Coût du bâtiment seulement

  -- Source
  source                  VARCHAR(20) DEFAULT 'calculated',
  -- 'calculated' | 'manual' | 'cpa_adjusted'
  notes                   TEXT DEFAULT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(property_id, fiscal_year, cca_class)
);

CREATE INDEX IF NOT EXISTS idx_cca_schedule_property ON cca_schedule(property_id, fiscal_year DESC);
CREATE INDEX IF NOT EXISTS idx_cca_schedule_org      ON cca_schedule(organization_id, fiscal_year DESC);

ALTER TABLE cca_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_manage_cca_schedule"
  ON cca_schedule FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- B. Fonction SQL : calculer CCA estimée pour une propriété
-- ─────────────────────────────────────────────────────────────
-- Usage : SELECT * FROM calculate_cca_estimate(property_id, start_year, end_year)
CREATE OR REPLACE FUNCTION calculate_cca_estimate(
  p_property_id UUID,
  p_start_year  INTEGER DEFAULT NULL,
  p_end_year    INTEGER DEFAULT NULL
)
RETURNS TABLE(
  fiscal_year     INTEGER,
  cca_class       VARCHAR,
  ucc_open        NUMERIC,
  cca_deducted    NUMERIC,
  ucc_close       NUMERIC,
  building_cost   NUMERIC,
  land_allocation NUMERIC
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_prop          RECORD;
  v_total_cost    NUMERIC;
  v_land_pct      NUMERIC := 0.20; -- 20% par défaut pour terrain
  v_building_cost NUMERIC;
  v_cca_rate      NUMERIC;
  v_cca_class     VARCHAR;
  v_acquisition_year INTEGER;
  v_ucc           NUMERIC;
  v_year          INTEGER;
  v_cca_this_year NUMERIC;
  v_start         INTEGER;
  v_end           INTEGER;
BEGIN
  -- Récupérer la propriété
  SELECT p.total_cost,
         COALESCE(p.cca_class, CASE WHEN p.country_code = 'US' THEN 'US_Res' ELSE 'Class1' END),
         EXTRACT(YEAR FROM p.reservation_date)::INTEGER
  INTO v_total_cost, v_cca_class, v_acquisition_year
  FROM properties p
  WHERE p.id = p_property_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Taux selon la classe
  v_cca_rate := CASE v_cca_class
    WHEN 'Class1'  THEN 0.04      -- 4% bâtiment résidentiel Canada
    WHEN 'Class8'  THEN 0.20      -- 20% mobilier/ameublement
    WHEN 'Class13' THEN 0.20      -- Améliorations locatives
    WHEN 'US_Res'  THEN 0.03636   -- 27.5 ans résidentiel USA
    WHEN 'US_Com'  THEN 0.02564   -- 39 ans commercial USA
    ELSE 0.04
  END;

  -- Coût du bâtiment (terrain non amortissable)
  v_building_cost := v_total_cost * (1 - v_land_pct);
  v_ucc := v_building_cost;

  v_start := COALESCE(p_start_year, v_acquisition_year);
  v_end   := COALESCE(p_end_year, EXTRACT(YEAR FROM NOW())::INTEGER);

  FOR v_year IN v_start..v_end LOOP
    -- Règle de la demi-année en année d'acquisition (Canada)
    IF v_year = v_acquisition_year THEN
      v_cca_this_year := ROUND(v_ucc * v_cca_rate * 0.5, 2);
    ELSE
      v_cca_this_year := ROUND(v_ucc * v_cca_rate, 2);
    END IF;
    v_cca_this_year := LEAST(v_cca_this_year, v_ucc);

    fiscal_year     := v_year;
    cca_class       := v_cca_class;
    ucc_open        := v_ucc;
    cca_deducted    := v_cca_this_year;
    ucc_close       := v_ucc - v_cca_this_year;
    building_cost   := v_building_cost;
    land_allocation := v_land_pct;

    RETURN NEXT;

    v_ucc := v_ucc - v_cca_this_year;
    IF v_ucc <= 0 THEN EXIT; END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- C. Colonnes supplémentaires sur transactions pour piste d'audit fiscale
-- ─────────────────────────────────────────────────────────────

-- Type de location (court terme / long terme — affecte Florida Sales Tax + ITBIS DR)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS rental_duration_days INTEGER DEFAULT NULL;
  -- Nombre de jours de la location. Court terme ≤ 182 jours (FL) ou ≤ 30 nuits (DR)

-- Taux de change source (si devise différente de CAD)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source_currency VARCHAR(3) DEFAULT NULL;
  -- Existe peut-être déjà — IF NOT EXISTS protège

DO $$
BEGIN
  -- source_amount peut déjà exister
  BEGIN
    ALTER TABLE transactions ADD COLUMN source_amount NUMERIC(14,2) DEFAULT NULL;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 198 OK';
  RAISE NOTICE '   cca_schedule : table FNACC/CCA créée (property, year, class, ucc_open/close, cca_deducted)';
  RAISE NOTICE '   calculate_cca_estimate(property_id, start_year, end_year) : fonction SQL';
  RAISE NOTICE '   transactions : rental_duration_days (court/long terme FL/DR), source_currency/source_amount (IF NOT EXISTS)';
END $$;
