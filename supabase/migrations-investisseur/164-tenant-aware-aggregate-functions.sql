-- =====================================================
-- MIGRATION 164: FONCTIONS D'AGRÉGAT TENANT-AWARE
-- =====================================================
-- PROBLÈME :
--   get_financial_summary, get_nav_timeline et calculate_realistic_nav_v2
--   agrègent les transactions/propriétés SANS filtrer par organization_id.
--   Conséquences observées :
--     - super_admin (voit tous les tenants via RLS) -> les KPI additionnent
--       CERDIA Globale + DEMO -> totaux DOUBLÉS sur le dashboard réel
--     - le mode "View as DEMO" affiche quand même les chiffres de CERDIA
--     - le mode visiteur (anon) affiche 0
--
-- SOLUTION :
--   Chaque fonction prend un paramètre optionnel p_org_id. L'org effective
--   = COALESCE(p_org_id, auth_get_org_id()). Toutes les requêtes filtrent
--   explicitement par cette org. Garde-fou : on ne peut viser une autre org
--   que la sienne que si on est super_admin OU si l'org cible est un démo.
--
--   Le frontend passera effectiveOrgId (real ou override "View as").
--
-- Dépendances : 95/98 (get_financial_summary), 111 (get_nav_timeline),
--   145 (auth_get_org_id, is_super_admin), 158 (organizations.is_demo)
-- =====================================================

-- =====================================================
-- 1. get_financial_summary(p_year, p_org_id)
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
  result_metric TEXT,
  result_value NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_org UUID := COALESCE(p_org_id, auth_get_org_id());
BEGIN
  -- Garde-fou : viser une autre org que la sienne requiert super_admin
  -- ou que l'org cible soit un démo public.
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
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Compte Courant Balance = entrées - sorties
  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      COALESCE((SELECT SUM(t1.amount) FROM transactions t1
        WHERE t1.type IN ('investissement', 'dividende')
          AND t1.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)), 0)
      -
      COALESCE((SELECT SUM(ABS(t2.amount)) FROM transactions t2
        WHERE t2.type IN ('paiement', 'depense')
          AND t2.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)), 0)
    )::NUMERIC

  UNION ALL

  -- CAPEX Balance
  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    (
      COALESCE((SELECT SUM(t4.amount) FROM transactions t4
        WHERE t4.payment_source = 'capex' AND t4.amount > 0
          AND t4.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t4.date)::INTEGER = p_year)), 0)
      -
      COALESCE((SELECT SUM(ABS(t5.amount)) FROM transactions t5
        WHERE t5.category = 'capex' AND t5.amount < 0
          AND t5.organization_id = v_org
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t5.date)::INTEGER = p_year)), 0)
    )::NUMERIC

  UNION ALL

  -- Dépenses Projets
  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- Coûts Opération
  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('paiement', 'depense')
    AND t.property_id IS NULL
    AND t.organization_id = v_org
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

COMMENT ON FUNCTION get_financial_summary(INTEGER, UUID) IS
  'Résumé financier filtré par organisation (p_org_id ou auth_get_org_id()).';

GRANT EXECUTE ON FUNCTION get_financial_summary(INTEGER, UUID) TO authenticated, anon;

-- =====================================================
-- 2. get_nav_timeline(p_org_id)
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

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t
    WHERE t.type = 'loyer' AND t.status != 'cancelled'
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
    WHERE t.type = 'loyer' AND t.status != 'cancelled' AND t.organization_id = v_org;

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

GRANT EXECUTE ON FUNCTION get_nav_timeline(UUID) TO authenticated, anon;

-- Vérification
SELECT
  '✅ MIGRATION 164 — FONCTIONS D''AGRÉGAT TENANT-AWARE' as status,
  'get_financial_summary(year, org_id) + get_nav_timeline(org_id)' as fonctions,
  'Filtre explicite par organization_id + garde-fou super_admin/démo' as securite;
