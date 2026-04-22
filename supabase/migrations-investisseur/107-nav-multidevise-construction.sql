-- ==========================================
-- MIGRATION 107: ÉVALUATIONS MULTI-DEVISE + NAV CONSTRUCTION
-- ==========================================
--
-- CHANGEMENTS:
-- 1. Ajouter `currency` et `exchange_rate_used` à property_valuations
-- 2. Mettre à jour les évaluations existantes avec la devise de leur propriété
-- 3. Ajouter get_property_appreciation_rate() → expected_roi → scénario → 8%
-- 4. Mettre à jour calculate_property_value_with_appreciation() (taux dynamique)
-- 5. Mettre à jour current_property_values (en_construction + actif + taux affiché)
-- 6. Mettre à jour calculate_realistic_nav_v2 (conversion par devise)
-- 7. Mettre à jour auto_create_initial_valuation (inclure currency)
--
-- NOTE: Toutes les opérations sont idempotentes (IF NOT EXISTS / CREATE OR REPLACE)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 107: NAV MULTI-DEVISE + PHASE CONSTRUCTION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- 1. COLONNES: currency et exchange_rate_used dans property_valuations
-- ==========================================

ALTER TABLE property_valuations
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'CAD';

ALTER TABLE property_valuations
  ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(10, 4);

-- Synchroniser la devise existante avec celle de la propriété liée
UPDATE property_valuations pv
SET currency = COALESCE(p.currency, 'USD')
FROM properties p
WHERE p.id = pv.property_id;

DO $$
BEGIN
  RAISE NOTICE '✅ Colonnes currency + exchange_rate_used ajoutées à property_valuations';
  RAISE NOTICE '✅ Devises synchronisées depuis properties';
END $$;

-- ==========================================
-- 1b. COLONNE: origin_scenario_id dans properties
-- ==========================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS origin_scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL;

-- Peupler depuis l'inverse: scenarios.converted_property_id
UPDATE properties p
SET origin_scenario_id = s.id
FROM scenarios s
WHERE s.converted_property_id = p.id
  AND p.origin_scenario_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_origin_scenario ON properties(origin_scenario_id);

DO $$
DECLARE
  v_linked INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_linked FROM properties WHERE origin_scenario_id IS NOT NULL;
  RAISE NOTICE '✅ Colonne origin_scenario_id ajoutée à properties';
  RAISE NOTICE '✅ % propriété(s) liée(s) à leur scénario d''origine', v_linked;
END $$;

-- ==========================================
-- 2. FONCTION: Taux d'appréciation dynamique par propriété
-- ==========================================

CREATE OR REPLACE FUNCTION get_property_appreciation_rate(p_property_id UUID)
RETURNS DECIMAL(5, 4) AS $$
DECLARE
  v_rate DECIMAL(5, 4);
BEGIN
  -- Priorité: expected_roi → annual_appreciation du scénario → 8% défaut
  SELECT COALESCE(
    CASE
      WHEN p.expected_roi > 0 AND p.expected_roi <= 50
      THEN p.expected_roi / 100.0
      ELSE NULL
    END,
    CASE
      WHEN (s.promoter_data->>'annual_appreciation') IS NOT NULL
           AND (s.promoter_data->>'annual_appreciation')::DECIMAL > 0
           AND (s.promoter_data->>'annual_appreciation')::DECIMAL <= 50
      THEN (s.promoter_data->>'annual_appreciation')::DECIMAL / 100.0
      ELSE NULL
    END,
    0.08
  )
  INTO v_rate
  FROM properties p
  LEFT JOIN scenarios s ON s.id = p.origin_scenario_id
  WHERE p.id = p_property_id;

  RETURN COALESCE(v_rate, 0.08);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_property_appreciation_rate IS
  'Taux annuel: expected_roi (propriété) → annual_appreciation (scénario) → 8% défaut';

DO $$
BEGIN
  RAISE NOTICE '✅ Fonction get_property_appreciation_rate() créée';
END $$;

-- ==========================================
-- 3. FONCTION: Calcul valeur avec appréciation
--    CORRECTIF: DATE - DATE = integer (jours) → diviser par 365.25, PAS EXTRACT(EPOCH)
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_property_value_with_appreciation(
  p_property_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_acquisition_cost  DECIMAL(15, 2);
  v_valuation_date    DATE;
  v_years_elapsed     DECIMAL(10, 4);
  v_appreciation_rate DECIMAL(5, 4);
  v_prop_total_cost   DECIMAL(15, 2);
  v_prop_start_date   DATE;
BEGIN
  -- Taux dynamique (expected_roi → scénario → 8%)
  v_appreciation_rate := get_property_appreciation_rate(p_property_id);

  -- Chercher l'évaluation initiale
  SELECT acquisition_cost, valuation_date
  INTO v_acquisition_cost, v_valuation_date
  FROM property_valuations
  WHERE property_id = p_property_id
    AND valuation_type = 'initial'
  ORDER BY valuation_date ASC
  LIMIT 1;

  IF v_acquisition_cost IS NOT NULL THEN
    -- DATE - DATE retourne INTEGER (jours), diviser par 365.25 = années décimales
    v_years_elapsed := (p_target_date - v_valuation_date)::NUMERIC / 365.25;
    IF v_years_elapsed < 0 THEN
      RETURN v_acquisition_cost;
    END IF;
    RETURN ROUND(v_acquisition_cost * POWER(1.0 + v_appreciation_rate, v_years_elapsed), 2);
  END IF;

  -- Pas d'évaluation: fallback sur total_cost + date réservation (phase construction)
  SELECT
    total_cost,
    COALESCE(reservation_date::DATE, completion_date::DATE)
  INTO v_prop_total_cost, v_prop_start_date
  FROM properties
  WHERE id = p_property_id;

  IF v_prop_total_cost IS NULL OR v_prop_total_cost <= 0 THEN
    RETURN 0;
  END IF;

  IF v_prop_start_date IS NULL THEN
    RETURN v_prop_total_cost;
  END IF;

  v_years_elapsed := (p_target_date - v_prop_start_date)::NUMERIC / 365.25;

  IF v_years_elapsed <= 0 THEN
    RETURN v_prop_total_cost;
  END IF;

  RETURN ROUND(v_prop_total_cost * POWER(1.0 + v_appreciation_rate, v_years_elapsed), 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_property_value_with_appreciation IS
  'Valeur actuelle avec taux dynamique. DATE-DATE=jours/365.25=années (pas EXTRACT).';

DO $$
BEGIN
  RAISE NOTICE '✅ Fonction calculate_property_value_with_appreciation() mise à jour';
END $$;

-- ==========================================
-- 4. VUE: current_property_values (toutes phases actives + devise + taux)
--    CORRECTIF: (DATE - DATE)::NUMERIC / 365.25 pour years_held
-- ==========================================

DROP VIEW IF EXISTS current_property_values;

CREATE OR REPLACE VIEW current_property_values AS
SELECT
  p.id                                                                              AS property_id,
  p.name                                                                            AS property_name,
  p.total_cost                                                                      AS acquisition_cost,
  COALESCE(p.reservation_date::DATE, p.completion_date::DATE)                      AS acquisition_date,

  -- Évaluation initiale enregistrée
  pv.acquisition_cost                                                               AS initial_acquisition_cost,
  pv.current_market_value                                                           AS initial_market_value,
  pv.valuation_date                                                                 AS initial_valuation_date,

  -- Valeur actuelle calculée (devise native de la propriété)
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE)                  AS current_value,

  -- Années détenues: DATE - DATE = integer jours → / 365.25 = années décimales
  GREATEST(
    (CURRENT_DATE - COALESCE(
      p.reservation_date::DATE,
      p.completion_date::DATE,
      pv.valuation_date,
      CURRENT_DATE
    ))::NUMERIC / 365.25,
    0
  )                                                                                 AS years_held,

  -- Gain d'appréciation
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE)
    - COALESCE(pv.acquisition_cost, p.total_cost, 0)                              AS appreciation_amount,

  -- Pourcentage d'appréciation
  CASE
    WHEN COALESCE(pv.acquisition_cost, p.total_cost, 0) > 0 THEN
      ROUND((
        (calculate_property_value_with_appreciation(p.id, CURRENT_DATE)
          - COALESCE(pv.acquisition_cost, p.total_cost))
        / COALESCE(pv.acquisition_cost, p.total_cost)
      ) * 100, 2)
    ELSE 0
  END                                                                               AS appreciation_percentage,

  p.status,
  p.currency,

  -- Taux utilisé (pour transparence dans le NAV)
  ROUND(get_property_appreciation_rate(p.id) * 100, 2)                            AS appreciation_rate_pct

FROM properties p
LEFT JOIN property_valuations pv
  ON p.id = pv.property_id AND pv.valuation_type = 'initial'
WHERE p.status IN (
  'reservation',
  'en_construction',
  'acquired',
  'complete',
  'actif',
  'en_location'
)
ORDER BY COALESCE(p.reservation_date::DATE, p.completion_date::DATE) DESC NULLS LAST;

COMMENT ON VIEW current_property_values IS
  'Valeurs actuelles: toutes phases actives, devise native, taux dynamique (DATE-DATE/365.25)';

DO $$
BEGIN
  RAISE NOTICE '✅ Vue current_property_values recréée (en_construction + actif inclus)';
END $$;

-- ==========================================
-- 5. FONCTION NAV: Conversion correcte par devise
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_realistic_nav_v2(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_investments        DECIMAL(15, 2),
  property_purchases       DECIMAL(15, 2),
  capex_expenses           DECIMAL(15, 2),
  maintenance_expenses     DECIMAL(15, 2),
  admin_expenses           DECIMAL(15, 2),
  rental_income            DECIMAL(15, 2),
  cash_balance             DECIMAL(15, 2),
  properties_initial_value DECIMAL(15, 2),
  properties_current_value DECIMAL(15, 2),
  properties_appreciation  DECIMAL(15, 2),
  total_assets             DECIMAL(15, 2),
  total_liabilities        DECIMAL(15, 2),
  net_asset_value          DECIMAL(15, 2),
  total_shares             DECIMAL(15, 4),
  nav_per_share            DECIMAL(10, 4),
  nav_change_pct           DECIMAL(10, 4)
) AS $$
DECLARE
  v_exchange_rate        DECIMAL(10, 4);
  v_construction_initial DECIMAL(15, 2);
BEGIN
  -- Taux de change USD → CAD
  SELECT get_current_exchange_rate('USD', 'CAD') INTO v_exchange_rate;
  IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
    v_exchange_rate := 1.40;
  END IF;

  -- ── Flux de trésorerie ──────────────────────────────────────────────────

  SELECT COALESCE(SUM(t.amount), 0) INTO total_investments
  FROM transactions t WHERE t.type = 'investissement';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO property_purchases
  FROM transactions t WHERE t.type = 'investissement' AND t.property_id IS NOT NULL;

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO capex_expenses
  FROM transactions t WHERE t.type = 'capex';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO maintenance_expenses
  FROM transactions t WHERE t.type = 'maintenance';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO admin_expenses
  FROM transactions t WHERE t.type = 'admin';

  SELECT COALESCE(SUM(t.amount), 0) INTO rental_income
  FROM transactions t WHERE t.type = 'loyer';

  cash_balance := total_investments - property_purchases
                  - capex_expenses - maintenance_expenses
                  - admin_expenses + rental_income;

  -- ── Valeur initiale des propriétés (évaluations initiales → en CAD) ─────

  SELECT COALESCE(SUM(
    CASE
      WHEN pv.currency = 'USD' THEN pv.acquisition_cost * v_exchange_rate
      ELSE pv.acquisition_cost
    END
  ), 0)
  INTO properties_initial_value
  FROM property_valuations pv
  WHERE pv.valuation_type = 'initial';

  -- Ajouter propriétés en construction/réservation SANS évaluation initiale
  SELECT COALESCE(SUM(
    CASE
      WHEN p.currency = 'USD' THEN p.total_cost * v_exchange_rate
      ELSE p.total_cost
    END
  ), 0)
  INTO v_construction_initial
  FROM properties p
  WHERE p.status IN ('reservation', 'en_construction', 'acquired', 'complete', 'actif', 'en_location')
    AND p.total_cost > 0
    AND NOT EXISTS (
      SELECT 1 FROM property_valuations pv2
      WHERE pv2.property_id = p.id AND pv2.valuation_type = 'initial'
    );

  properties_initial_value := properties_initial_value + COALESCE(v_construction_initial, 0);

  -- ── Valeur actuelle avec appréciation (convertie en CAD) ─────────────────

  SELECT COALESCE(SUM(
    CASE
      WHEN cpv.currency = 'USD' THEN cpv.current_value * v_exchange_rate
      ELSE cpv.current_value
    END
  ), 0)
  INTO properties_current_value
  FROM current_property_values cpv;

  -- ── NAV ──────────────────────────────────────────────────────────────────

  properties_appreciation := properties_current_value - properties_initial_value;
  total_assets             := cash_balance + properties_current_value;
  total_liabilities        := 0;
  net_asset_value          := total_assets - total_liabilities;

  SELECT COALESCE(SUM(number_of_shares), 0) INTO total_shares
  FROM investor_investments;

  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.00;
  END IF;

  nav_change_pct := ((nav_per_share - 1.00) / 1.00) * 100;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_realistic_nav_v2 IS
  'NAV complet: conversion USD/CAD par devise, toutes phases actives, taux dynamique';

DO $$
BEGIN
  RAISE NOTICE '✅ Fonction calculate_realistic_nav_v2() mise à jour (conversion par devise)';
END $$;

-- ==========================================
-- 6. TRIGGER: auto_create_initial_valuation avec currency
-- ==========================================

CREATE OR REPLACE FUNCTION auto_create_initial_valuation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('acquired', 'complete')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('acquired', 'complete')) THEN
    IF NOT EXISTS (
      SELECT 1 FROM property_valuations
      WHERE property_id = NEW.id AND valuation_type = 'initial'
    ) THEN
      INSERT INTO property_valuations (
        property_id,
        valuation_date,
        valuation_type,
        acquisition_cost,
        current_market_value,
        currency,
        valuation_method,
        appraiser_name,
        notes
      ) VALUES (
        NEW.id,
        COALESCE(NEW.reservation_date::DATE, NEW.completion_date::DATE, CURRENT_DATE),
        'initial',
        NEW.total_cost,
        NEW.total_cost,
        COALESCE(NEW.currency, 'USD'),
        'purchase_price',
        'Système automatique',
        'Évaluation initiale auto — ' || NEW.name
      );
      RAISE NOTICE '✅ Évaluation initiale créée pour %: % %', NEW.name, NEW.total_cost, COALESCE(NEW.currency, 'USD');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_initial_valuation IS
  'Crée évaluation initiale à l''acquisition (avec devise de la propriété)';

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger auto_create_initial_valuation mis à jour (inclure currency)';
END $$;

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

DO $$
DECLARE
  v_nb_props            INTEGER;
  v_nb_construction     INTEGER;
  v_nb_reservation      INTEGER;
  v_nb_evaluations      INTEGER;
  v_nb_eval_usd         INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION MIGRATION 107';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO v_nb_props FROM current_property_values;
  SELECT COUNT(*) INTO v_nb_reservation FROM current_property_values WHERE status = 'reservation';
  SELECT COUNT(*) INTO v_nb_construction FROM current_property_values WHERE status = 'en_construction';
  SELECT COUNT(*) INTO v_nb_evaluations FROM property_valuations;
  SELECT COUNT(*) INTO v_nb_eval_usd FROM property_valuations WHERE currency = 'USD';

  RAISE NOTICE '📊 Propriétés dans current_property_values : %', v_nb_props;
  RAISE NOTICE '   • En réservation : %', v_nb_reservation;
  RAISE NOTICE '   • En construction : %', v_nb_construction;
  RAISE NOTICE '📊 Évaluations total : %', v_nb_evaluations;
  RAISE NOTICE '   • En USD : %', v_nb_eval_usd;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES:';
  RAISE NOTICE '   1. Rafraîchir Admin/NAV (F5)';
  RAISE NOTICE '   2. Admin/Évaluations → Nouvelle évaluation → voir champ Devise';
  RAISE NOTICE '   3. Pour propriété USD: entrer valeur en USD → voir conversion CAD';
  RAISE NOTICE '   4. Le NAV s''ajuste automatiquement au taux de change actuel';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

SELECT '✅ MIGRATION 107 TERMINÉE — NAV multi-devise + phase construction' AS status;
