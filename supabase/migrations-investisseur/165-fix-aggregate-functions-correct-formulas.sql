-- =====================================================
-- MIGRATION 165: CORRECTIF — bonnes formules + filtre tenant
-- =====================================================
-- PROBLÈME :
--   La migration 164 a rendu get_financial_summary / get_nav_timeline
--   tenant-aware, MAIS en les recréant à partir de versions PÉRIMÉES :
--     - get_financial_summary basée sur la mig 98 (la version correcte
--       est la mig 120 : entrées loyer/loyer_locatif/revenu, sorties qui
--       respectent affects_compte_courant)
--     - get_nav_timeline basée sur la mig 111 (la version correcte est
--       la mig 116 : revenus = loyer + loyer_locatif + revenu)
--   -> Compte Courant affiché 84 846 au lieu de ~119 500.
--
-- SOLUTION :
--   Recréer les 2 fonctions à partir de leur DERNIÈRE version correcte
--   (mig 120 / mig 116) en y intégrant le filtre tenant (p_org_id +
--   organization_id = v_org + garde-fou).
--
-- Aucune donnée n'a jamais été touchée — uniquement la fonction de calcul.
--
-- Dépendances : 116, 120 (formules), 145 (auth_get_org_id, is_super_admin),
--   158 (organizations.is_demo)
-- =====================================================

-- =====================================================
-- 1. get_financial_summary — base mig 120 + filtre tenant
-- =====================================================
DROP FUNCTION IF EXISTS get_financial_summary(integer);
DROP FUNCTION IF EXISTS get_financial_summary(integer, uuid);
DROP FUNCTION IF EXISTS get_financial_summary();

CREATE OR REPLACE FUNCTION get_financial_summary(
  p_year INTEGER DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
  result_category TEXT,
  result_metric   TEXT,
  result_value    NUMERIC
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_org UUID := COALESCE(p_org_id, auth_get_org_id());
BEGIN
  -- Garde-fou tenant
  IF v_org IS DISTINCT FROM auth_get_org_id() THEN
    IF NOT is_super_admin()
       AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = v_org AND o.is_demo = true) THEN
      RAISE EXCEPTION 'Accès non autorisé aux données de cette organisation';
    END IF;
  END IF;

  RETURN QUERY

  -- Total Investisseurs
  SELECT
    'investissement'::TEXT,
    'Total Investisseurs'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.status != 'cancelled'
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Compte Courant : entrées toujours comptées, sorties respectent affects_compte_courant
  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      COALESCE((
        SELECT SUM(t1.amount) FROM transactions t1
        WHERE t1.type IN ('investissement','loyer','loyer_locatif','revenu','dividende')
          AND t1.status != 'cancelled'
          AND t1.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)
      ), 0)
      -
      COALESCE((
        SELECT SUM(t2.amount) FROM transactions t2
        WHERE t2.type IN (
            'achat_propriete','capex','maintenance','admin',
            'depense','remboursement_investisseur','paiement','courant','rnd'
          )
          AND t2.status != 'cancelled'
          AND (t2.affects_compte_courant IS NOT FALSE)
          AND t2.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)
      ), 0)
    )::NUMERIC

  UNION ALL

  -- CAPEX Réserve
  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'capex'
    AND t.status != 'cancelled'
    AND (t.affects_compte_courant IS NOT FALSE)
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Dépenses Projets
  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND t.status != 'cancelled'
    AND (t.affects_compte_courant IS NOT FALSE)
    AND t.type IN ('achat_propriete','capex','maintenance','admin','depense','paiement')
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Coûts Opération
  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('maintenance','admin','depense')
    AND t.property_id IS NULL
    AND t.status != 'cancelled'
    AND (t.affects_compte_courant IS NOT FALSE)
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

COMMENT ON FUNCTION get_financial_summary(INTEGER, UUID) IS
  'KPIs financiers — formule mig 120 (affects_compte_courant) + filtre tenant.';
GRANT EXECUTE ON FUNCTION get_financial_summary(INTEGER, UUID) TO authenticated, anon;

-- =====================================================
-- 2. get_nav_timeline — base mig 116 + filtre tenant
-- =====================================================
DROP FUNCTION IF EXISTS get_nav_timeline();
DROP FUNCTION IF EXISTS get_nav_timeline(uuid);

CREATE OR REPLACE FUNCTION get_nav_timeline(p_org_id UUID DEFAULT NULL)
RETURNS TABLE (
  point_date      DATE,
  nav_per_share   NUMERIC,
  net_asset_value NUMERIC,
  total_shares    NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org        UUID := COALESCE(p_org_id, auth_get_org_id());
  v_start_date DATE;
  v_end_date   DATE := CURRENT_DATE;
  v_cur_date   DATE;
  v_last_date  DATE;
  v_exchange          NUMERIC;
  v_first_invest_date DATE;
  v_inv        NUMERIC;
  v_purch      NUMERIC;
  v_other      NUMERIC;
  v_rental     NUMERIC;
  v_cash       NUMERIC;
  v_shares     NUMERIC;
  v_prop_val   NUMERIC;
  v_nav_val    NUMERIC;
  v_nav_ps     NUMERIC;
BEGIN
  -- Garde-fou tenant
  IF v_org IS DISTINCT FROM auth_get_org_id() THEN
    IF NOT is_super_admin()
       AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = v_org AND o.is_demo = true) THEN
      RAISE EXCEPTION 'Accès non autorisé aux données de cette organisation';
    END IF;
  END IF;
  IF v_org IS NULL THEN RETURN; END IF;

  v_exchange := COALESCE(get_current_exchange_rate('USD', 'CAD'), 1.40);
  IF v_exchange IS NULL OR v_exchange <= 0 THEN v_exchange := 1.40; END IF;

  SELECT MIN(t.date) INTO v_first_invest_date
  FROM transactions t
  WHERE t.type = 'investissement' AND t.status != 'cancelled'
    AND t.organization_id = v_org;
  IF v_first_invest_date IS NULL THEN RETURN; END IF;

  SELECT MIN(t.date) INTO v_start_date
  FROM transactions t
  WHERE t.status != 'cancelled' AND t.organization_id = v_org;
  IF v_start_date IS NULL THEN RETURN; END IF;

  v_cur_date  := DATE_TRUNC('month', v_start_date)::DATE;
  v_last_date := NULL;

  WHILE v_cur_date <= v_end_date LOOP
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_inv
    FROM transactions t
    WHERE t.type = 'investissement' AND t.status != 'cancelled'
      AND t.organization_id = v_org AND t.date <= v_cur_date;

    IF v_inv = 0 THEN
      v_cur_date := (v_cur_date + INTERVAL '1 month')::DATE;
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_purch
    FROM transactions t
    WHERE t.type IN ('achat_propriete', 'paiement')
      AND t.property_id IS NOT NULL AND t.status != 'cancelled'
      AND t.organization_id = v_org AND t.date <= v_cur_date;

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_other
    FROM transactions t
    WHERE t.type IN ('capex', 'maintenance', 'admin', 'depense', 'remboursement_investisseur')
      AND t.status != 'cancelled'
      AND t.organization_id = v_org AND t.date <= v_cur_date;

    -- Revenus : loyer + loyer_locatif + revenu (mig 116)
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t
    WHERE t.type IN ('loyer', 'loyer_locatif', 'revenu')
      AND t.status != 'cancelled'
      AND t.organization_id = v_org AND t.date <= v_cur_date;

    v_cash := v_inv - v_purch - v_other + v_rental;
    v_shares := v_inv;

    SELECT COALESCE(SUM(
      COALESCE((
        SELECT SUM(ABS(t2.amount))
        FROM transactions t2
        WHERE t2.property_id = p.id
          AND t2.type IN ('achat_propriete', 'paiement')
          AND t2.status != 'cancelled'
          AND t2.organization_id = v_org
          AND t2.date <= v_cur_date
      ), 0)
      +
      GREATEST(
        CASE
          WHEN COALESCE(p.reservation_date::DATE, p.completion_date::DATE) IS NOT NULL
               AND p.total_cost > 0
               AND (v_cur_date - GREATEST(COALESCE(p.reservation_date::DATE, p.completion_date::DATE), v_first_invest_date)) > 0
          THEN
            (CASE WHEN p.currency = 'USD' THEN p.total_cost * v_exchange ELSE p.total_cost END)
            * (POWER(1.0 + get_property_appreciation_rate(p.id),
                (v_cur_date - GREATEST(COALESCE(p.reservation_date::DATE, p.completion_date::DATE), v_first_invest_date))::NUMERIC / 365.25
               ) - 1.0)
          ELSE 0.0
        END, 0.0)
    ), 0)
    INTO v_prop_val
    FROM properties p
    WHERE p.organization_id = v_org
      AND p.status IN ('reservation', 'en_construction', 'acquired', 'complete', 'actif', 'en_location');

    v_nav_val := v_cash + v_prop_val;
    IF v_shares > 0 THEN v_nav_ps := v_nav_val / v_shares; ELSE v_nav_ps := 1.0; END IF;

    point_date      := v_cur_date;
    nav_per_share   := GREATEST(COALESCE(v_nav_ps, 1.0), 0.5);
    net_asset_value := COALESCE(v_nav_val, 0);
    total_shares    := COALESCE(v_shares, 0);
    v_last_date     := v_cur_date;
    RETURN NEXT;

    v_cur_date := (v_cur_date + INTERVAL '1 month')::DATE;
  END LOOP;

  -- Dernier point = aujourd'hui
  IF v_last_date IS NULL OR v_last_date < v_end_date THEN
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_inv
    FROM transactions t
    WHERE t.type = 'investissement' AND t.status != 'cancelled' AND t.organization_id = v_org;

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_purch
    FROM transactions t
    WHERE t.type IN ('achat_propriete', 'paiement') AND t.property_id IS NOT NULL
      AND t.status != 'cancelled' AND t.organization_id = v_org;

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_other
    FROM transactions t
    WHERE t.type IN ('capex', 'maintenance', 'admin', 'depense', 'remboursement_investisseur')
      AND t.status != 'cancelled' AND t.organization_id = v_org;

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t
    WHERE t.type IN ('loyer', 'loyer_locatif', 'revenu')
      AND t.status != 'cancelled' AND t.organization_id = v_org;

    v_cash := v_inv - v_purch - v_other + v_rental;
    v_shares := v_inv;

    SELECT COALESCE(SUM(
      COALESCE((
        SELECT SUM(ABS(t2.amount))
        FROM transactions t2
        WHERE t2.property_id = p.id AND t2.type IN ('achat_propriete', 'paiement')
          AND t2.status != 'cancelled' AND t2.organization_id = v_org
      ), 0)
      +
      GREATEST(
        CASE
          WHEN COALESCE(p.reservation_date::DATE, p.completion_date::DATE) IS NOT NULL
               AND p.total_cost > 0
               AND (v_end_date - GREATEST(COALESCE(p.reservation_date::DATE, p.completion_date::DATE), v_first_invest_date)) > 0
          THEN
            (CASE WHEN p.currency = 'USD' THEN p.total_cost * v_exchange ELSE p.total_cost END)
            * (POWER(1.0 + get_property_appreciation_rate(p.id),
                (v_end_date - GREATEST(COALESCE(p.reservation_date::DATE, p.completion_date::DATE), v_first_invest_date))::NUMERIC / 365.25
               ) - 1.0)
          ELSE 0.0 END, 0.0)
    ), 0)
    INTO v_prop_val
    FROM properties p
    WHERE p.organization_id = v_org
      AND p.status IN ('reservation', 'en_construction', 'acquired', 'complete', 'actif', 'en_location');

    v_nav_val := v_cash + v_prop_val;

    IF v_shares > 0 AND v_inv > 0 THEN
      v_nav_ps        := v_nav_val / v_shares;
      point_date      := v_end_date;
      nav_per_share   := GREATEST(COALESCE(v_nav_ps, 1.0), 0.5);
      net_asset_value := COALESCE(v_nav_val, 0);
      total_shares    := COALESCE(v_shares, 0);
      RETURN NEXT;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_nav_timeline(UUID) IS
  'Timeline NAV — formule mig 116 (loyer + loyer_locatif + revenu) + filtre tenant.';
GRANT EXECUTE ON FUNCTION get_nav_timeline(UUID) TO authenticated, anon;

-- Vérification
SELECT
  '✅ MIGRATION 165 — FORMULES CORRIGÉES + FILTRE TENANT' as status,
  'get_financial_summary = mig 120 + p_org_id' as fn1,
  'get_nav_timeline = mig 116 + p_org_id' as fn2;
