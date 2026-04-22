-- ==========================================
-- MIGRATION 107b: CORRECTIF ARITHMÉTIQUE DE DATES
-- ==========================================
--
-- PROBLÈME:
-- DATE - DATE retourne un INTEGER (nb jours) en PostgreSQL.
-- EXTRACT(EPOCH FROM integer) n'existe pas → erreur 42883.
--
-- SOLUTION:
-- Remplacer EXTRACT(EPOCH FROM (date1 - date2)) / (365.25 * 24 * 3600)
-- par (date1 - date2)::NUMERIC / 365.25
-- (DATE - DATE = jours, / 365.25 = années décimales)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 107b: CORRECTIF ARITHMÉTIQUE DE DATES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- 1. CORRIGER: calculate_property_value_with_appreciation
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

  -- Chercher évaluation initiale
  SELECT acquisition_cost, valuation_date
  INTO v_acquisition_cost, v_valuation_date
  FROM property_valuations
  WHERE property_id = p_property_id
    AND valuation_type = 'initial'
  ORDER BY valuation_date ASC
  LIMIT 1;

  IF v_acquisition_cost IS NOT NULL THEN
    -- DATE - DATE = integer (jours), diviser par 365.25 = années
    v_years_elapsed := (p_target_date - v_valuation_date)::NUMERIC / 365.25;
    IF v_years_elapsed < 0 THEN
      RETURN v_acquisition_cost;
    END IF;
    RETURN ROUND(v_acquisition_cost * POWER(1.0 + v_appreciation_rate, v_years_elapsed), 2);
  END IF;

  -- Fallback: total_cost + date réservation (phase construction)
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
  'Valeur actuelle avec appréciation dynamique. DATE-DATE=jours/365.25=années.';

DO $$
BEGIN
  RAISE NOTICE '✅ calculate_property_value_with_appreciation() corrigée (date arithmetic)';
END $$;

-- ==========================================
-- 2. CORRIGER: current_property_values (EXTRACT remplacé)
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

  -- Années détenues: DATE - DATE = integer jours, / 365.25 = années décimales
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
  RAISE NOTICE '✅ Vue current_property_values recréée (EXTRACT remplacé par /365.25)';
END $$;

-- ==========================================
-- VÉRIFICATION
-- ==========================================

DO $$
DECLARE
  v_nb_props   INTEGER;
  v_test_val   DECIMAL(15,2);
BEGIN
  SELECT COUNT(*) INTO v_nb_props FROM current_property_values;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION 107b';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 Propriétés dans current_property_values : %', v_nb_props;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Arithmétique de dates corrigée — pas d''erreur EXTRACT';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 107b TERMINÉE — Arithmétique de dates corrigée' AS status;
