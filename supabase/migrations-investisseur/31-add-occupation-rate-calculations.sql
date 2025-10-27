-- =====================================================
-- SCRIPT 31: CALCUL DES TAUX D'OCCUPATION
-- =====================================================
-- Description: Vues pour calculer les taux d'occupation
--              par unité (mensuel/trimestriel/annuel)
--              et par investisseur (% utilisation)
-- Dépendances: Script 30 (calendrier unifié)
-- =====================================================

-- =====================================================
-- VUE 1: TAUX D'OCCUPATION MENSUEL PAR UNITÉ
-- =====================================================
CREATE OR REPLACE VIEW monthly_occupation_rates AS
SELECT
  s.id as scenario_id,
  s.name as property_name,
  s.unit_number,
  EXTRACT(YEAR FROM sb.start_date) as year,
  EXTRACT(MONTH FROM sb.start_date) as month,
  COUNT(DISTINCT sb.start_date) as days_booked_commercial,
  COUNT(DISTINCT ir.start_date) as days_booked_personal,
  COUNT(DISTINCT sb.start_date) + COUNT(DISTINCT ir.start_date) as total_days_booked,
  DATE_PART('days', DATE_TRUNC('month', sb.start_date) + INTERVAL '1 month' - DATE_TRUNC('month', sb.start_date)) as days_in_month,
  ROUND(
    (((COUNT(DISTINCT sb.start_date) + COUNT(DISTINCT ir.start_date)) * 100.0) /
    DATE_PART('days', DATE_TRUNC('month', sb.start_date) + INTERVAL '1 month' - DATE_TRUNC('month', sb.start_date)))::NUMERIC
  , 2) as occupation_rate_pct
FROM scenarios s
LEFT JOIN scenario_bookings sb ON s.id = sb.scenario_id
  AND sb.status IN ('confirmed', 'completed')
LEFT JOIN investor_reservations ir ON s.id = ir.scenario_id
  AND ir.status = 'confirmed'
  AND EXTRACT(YEAR FROM ir.start_date) = EXTRACT(YEAR FROM sb.start_date)
  AND EXTRACT(MONTH FROM ir.start_date) = EXTRACT(MONTH FROM sb.start_date)
WHERE s.status = 'purchased'
GROUP BY s.id, s.name, s.unit_number, EXTRACT(YEAR FROM sb.start_date), EXTRACT(MONTH FROM sb.start_date), DATE_TRUNC('month', sb.start_date);

-- =====================================================
-- VUE 2: TAUX D'OCCUPATION TRIMESTRIEL PAR UNITÉ
-- =====================================================
CREATE OR REPLACE VIEW quarterly_occupation_rates AS
SELECT
  s.id as scenario_id,
  s.name as property_name,
  s.unit_number,
  EXTRACT(YEAR FROM dates.date) as year,
  EXTRACT(QUARTER FROM dates.date) as quarter,
  COUNT(DISTINCT CASE WHEN sb.start_date <= dates.date AND sb.end_date >= dates.date THEN dates.date END) as days_booked_commercial,
  COUNT(DISTINCT CASE WHEN ir.start_date <= dates.date AND ir.end_date >= dates.date THEN dates.date END) as days_booked_personal,
  COUNT(DISTINCT CASE
    WHEN (sb.start_date <= dates.date AND sb.end_date >= dates.date)
      OR (ir.start_date <= dates.date AND ir.end_date >= dates.date)
    THEN dates.date
  END) as total_days_booked,
  COUNT(DISTINCT dates.date) as days_in_quarter,
  ROUND(
    ((COUNT(DISTINCT CASE
      WHEN (sb.start_date <= dates.date AND sb.end_date >= dates.date)
        OR (ir.start_date <= dates.date AND ir.end_date >= dates.date)
      THEN dates.date
    END) * 100.0) / COUNT(DISTINCT dates.date))::NUMERIC
  , 2) as occupation_rate_pct
FROM scenarios s
CROSS JOIN LATERAL (
  SELECT generate_series(
    DATE_TRUNC('quarter', CURRENT_DATE - INTERVAL '2 years'),
    DATE_TRUNC('quarter', CURRENT_DATE + INTERVAL '1 year') + INTERVAL '3 months',
    INTERVAL '1 day'
  )::date as date
) dates
LEFT JOIN scenario_bookings sb ON s.id = sb.scenario_id
  AND sb.status IN ('confirmed', 'completed')
  AND sb.start_date <= dates.date
  AND sb.end_date >= dates.date
LEFT JOIN investor_reservations ir ON s.id = ir.scenario_id
  AND ir.status = 'confirmed'
  AND ir.start_date <= dates.date
  AND ir.end_date >= dates.date
WHERE s.status = 'purchased'
GROUP BY s.id, s.name, s.unit_number, EXTRACT(YEAR FROM dates.date), EXTRACT(QUARTER FROM dates.date);

-- =====================================================
-- VUE 3: TAUX D'OCCUPATION ANNUEL PAR UNITÉ
-- =====================================================
CREATE OR REPLACE VIEW annual_occupation_rates AS
SELECT
  s.id as scenario_id,
  s.name as property_name,
  s.unit_number,
  EXTRACT(YEAR FROM dates.date) as year,
  COUNT(DISTINCT CASE WHEN sb.start_date <= dates.date AND sb.end_date >= dates.date THEN dates.date END) as days_booked_commercial,
  COUNT(DISTINCT CASE WHEN ir.start_date <= dates.date AND ir.end_date >= dates.date THEN dates.date END) as days_booked_personal,
  COUNT(DISTINCT CASE
    WHEN (sb.start_date <= dates.date AND sb.end_date >= dates.date)
      OR (ir.start_date <= dates.date AND ir.end_date >= dates.date)
    THEN dates.date
  END) as total_days_booked,
  365 as days_in_year,
  ROUND(
    ((COUNT(DISTINCT CASE
      WHEN (sb.start_date <= dates.date AND sb.end_date >= dates.date)
        OR (ir.start_date <= dates.date AND ir.end_date >= dates.date)
      THEN dates.date
    END) * 100.0) / 365)::NUMERIC
  , 2) as occupation_rate_pct,
  ROUND(
    ((COUNT(DISTINCT CASE WHEN sb.start_date <= dates.date AND sb.end_date >= dates.date THEN dates.date END) * 100.0) / 365)::NUMERIC
  , 2) as commercial_rate_pct,
  ROUND(
    ((COUNT(DISTINCT CASE WHEN ir.start_date <= dates.date AND ir.end_date >= dates.date THEN dates.date END) * 100.0) / 365)::NUMERIC
  , 2) as personal_rate_pct
FROM scenarios s
CROSS JOIN LATERAL (
  SELECT generate_series(
    DATE_TRUNC('year', CURRENT_DATE - INTERVAL '2 years'),
    DATE_TRUNC('year', CURRENT_DATE + INTERVAL '1 year') + INTERVAL '1 year',
    INTERVAL '1 day'
  )::date as date
) dates
LEFT JOIN scenario_bookings sb ON s.id = sb.scenario_id
  AND sb.status IN ('confirmed', 'completed')
  AND sb.start_date <= dates.date
  AND sb.end_date >= dates.date
LEFT JOIN investor_reservations ir ON s.id = ir.scenario_id
  AND ir.status = 'confirmed'
  AND ir.start_date <= dates.date
  AND ir.end_date >= dates.date
WHERE s.status = 'purchased'
  AND EXTRACT(YEAR FROM dates.date) = EXTRACT(YEAR FROM dates.date)
GROUP BY s.id, s.name, s.unit_number, EXTRACT(YEAR FROM dates.date);

-- =====================================================
-- VUE 4: TAUX D'UTILISATION PAR INVESTISSEUR (PERSONNEL)
-- =====================================================
CREATE OR REPLACE VIEW investor_occupation_rates AS
SELECT
  i.id as investor_id,
  i.first_name || ' ' || i.last_name as investor_name,
  s.id as scenario_id,
  s.name as property_name,
  s.unit_number,
  EXTRACT(YEAR FROM ir.start_date) as year,
  ip.percentage as ownership_percentage,
  s.owner_occupation_days as max_days_per_unit,
  ROUND(((ip.percentage / 100.0) * s.owner_occupation_days)::NUMERIC, 2) as entitled_days,
  COUNT(DISTINCT DATE(ir.start_date)) as days_used,
  ROUND(((ip.percentage / 100.0) * s.owner_occupation_days)::NUMERIC, 2) - COUNT(DISTINCT DATE(ir.start_date)) as days_remaining,
  ROUND(
    ((COUNT(DISTINCT DATE(ir.start_date)) * 100.0) /
    NULLIF((ip.percentage / 100.0) * s.owner_occupation_days, 0))::NUMERIC
  , 2) as utilization_rate_pct
FROM investors i
JOIN investor_properties ip ON i.id = ip.investor_id
JOIN scenarios s ON ip.property_id = s.id
LEFT JOIN investor_reservations ir ON i.id = ir.investor_id
  AND s.id = ir.scenario_id
  AND ir.status = 'confirmed'
  AND EXTRACT(YEAR FROM ir.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE s.status = 'purchased'
GROUP BY i.id, i.first_name, i.last_name, s.id, s.name, s.unit_number, ip.percentage, s.owner_occupation_days, EXTRACT(YEAR FROM ir.start_date);

-- =====================================================
-- FONCTION: OBTENIR STATS D'OCCUPATION PAR PROJET
-- =====================================================
CREATE OR REPLACE FUNCTION get_project_occupation_stats(
  p_scenario_id UUID,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  period_type TEXT,
  period_label TEXT,
  days_booked_commercial INTEGER,
  days_booked_personal INTEGER,
  total_days_booked INTEGER,
  total_days_in_period INTEGER,
  occupation_rate_pct NUMERIC
) AS $$
BEGIN
  -- Par défaut, année en cours
  IF p_year IS NULL THEN
    p_year := EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;

  -- Retourner les stats annuelles
  RETURN QUERY
  SELECT
    'annual'::TEXT,
    p_year::TEXT,
    aor.days_booked_commercial::INTEGER,
    aor.days_booked_personal::INTEGER,
    aor.total_days_booked::INTEGER,
    aor.days_in_year::INTEGER,
    aor.occupation_rate_pct
  FROM annual_occupation_rates aor
  WHERE aor.scenario_id = p_scenario_id
    AND aor.year = p_year;

  -- Retourner les stats trimestrielles
  RETURN QUERY
  SELECT
    'quarterly'::TEXT,
    'Q' || qor.quarter::TEXT || ' ' || qor.year::TEXT,
    qor.days_booked_commercial::INTEGER,
    qor.days_booked_personal::INTEGER,
    qor.total_days_booked::INTEGER,
    qor.days_in_quarter::INTEGER,
    qor.occupation_rate_pct
  FROM quarterly_occupation_rates qor
  WHERE qor.scenario_id = p_scenario_id
    AND qor.year = p_year
  ORDER BY qor.quarter;

  -- Retourner les stats mensuelles
  RETURN QUERY
  SELECT
    'monthly'::TEXT,
    TO_CHAR(TO_DATE(mor.month::TEXT, 'MM'), 'Month') || ' ' || mor.year::TEXT,
    mor.days_booked_commercial::INTEGER,
    mor.days_booked_personal::INTEGER,
    mor.total_days_booked::INTEGER,
    mor.days_in_month::INTEGER,
    mor.occupation_rate_pct
  FROM monthly_occupation_rates mor
  WHERE mor.scenario_id = p_scenario_id
    AND mor.year = p_year
  ORDER BY mor.month;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: OBTENIR STATS D'OCCUPATION PAR INVESTISSEUR
-- =====================================================
CREATE OR REPLACE FUNCTION get_investor_occupation_stats(
  p_investor_id UUID,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  property_name TEXT,
  unit_number TEXT,
  ownership_percentage NUMERIC,
  entitled_days NUMERIC,
  days_used BIGINT,
  days_remaining NUMERIC,
  utilization_rate_pct NUMERIC
) AS $$
BEGIN
  -- Par défaut, année en cours
  IF p_year IS NULL THEN
    p_year := EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;

  RETURN QUERY
  SELECT
    ior.property_name::TEXT,
    ior.unit_number::TEXT,
    ior.ownership_percentage,
    ior.entitled_days,
    ior.days_used,
    ior.days_remaining,
    ior.utilization_rate_pct
  FROM investor_occupation_rates ior
  WHERE ior.investor_id = p_investor_id
    AND (ior.year = p_year OR ior.year IS NULL)
  ORDER BY ior.property_name, ior.unit_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 31: CALCUL DES TAUX D''OCCUPATION CRÉÉ';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - monthly_occupation_rates: Taux mensuel par unité';
  RAISE NOTICE '  - quarterly_occupation_rates: Taux trimestriel par unité';
  RAISE NOTICE '  - annual_occupation_rates: Taux annuel par unité';
  RAISE NOTICE '  - investor_occupation_rates: Taux d''utilisation par investisseur';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - get_project_occupation_stats(): Stats complètes par projet';
  RAISE NOTICE '  - get_investor_occupation_stats(): Stats par investisseur';
  RAISE NOTICE ' ';
  RAISE NOTICE '✓ Système de calcul de taux d''occupation prêt!';
END $$;
