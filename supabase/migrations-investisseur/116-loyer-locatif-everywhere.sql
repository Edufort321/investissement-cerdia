-- Migration 116: Traiter loyer_locatif identiquement à loyer partout
--
-- loyer_locatif doit apparaître dans :
--   1. get_nav_timeline()       — revenu cash (v_rental)
--   2. investor_summary VIEW    — (pas concerné, mais on documente)
--   3. Tout calcul de type « revenu locatif »

-- ─── 1. Mettre à jour get_nav_timeline() ─────────────────────────────────────

DROP FUNCTION IF EXISTS get_nav_timeline();

CREATE OR REPLACE FUNCTION get_nav_timeline()
RETURNS TABLE (
  point_date      DATE,
  nav_per_share   NUMERIC,
  net_asset_value NUMERIC,
  total_shares    NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
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
  v_exchange := COALESCE(get_current_exchange_rate('USD', 'CAD'), 1.40);
  IF v_exchange IS NULL OR v_exchange <= 0 THEN v_exchange := 1.40; END IF;

  SELECT MIN(t.date) INTO v_first_invest_date
  FROM transactions t WHERE t.type = 'investissement' AND t.status != 'cancelled';
  IF v_first_invest_date IS NULL THEN RETURN; END IF;

  SELECT MIN(t.date) INTO v_start_date
  FROM transactions t WHERE t.status != 'cancelled';
  IF v_start_date IS NULL THEN RETURN; END IF;

  v_cur_date  := DATE_TRUNC('month', v_start_date)::DATE;
  v_last_date := NULL;

  WHILE v_cur_date <= v_end_date LOOP

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_inv
    FROM transactions t
    WHERE t.type = 'investissement' AND t.status != 'cancelled' AND t.date <= v_cur_date;

    IF v_inv = 0 THEN
      v_cur_date := (v_cur_date + INTERVAL '1 month')::DATE;
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_purch
    FROM transactions t
    WHERE t.type IN ('achat_propriete', 'paiement')
      AND t.property_id IS NOT NULL
      AND t.status != 'cancelled'
      AND t.date <= v_cur_date;

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_other
    FROM transactions t
    WHERE t.type IN ('capex', 'maintenance', 'admin', 'depense', 'remboursement_investisseur')
      AND t.status != 'cancelled'
      AND t.date <= v_cur_date;

    -- Revenus : loyer + loyer_locatif + revenu général
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t
    WHERE t.type IN ('loyer', 'loyer_locatif', 'revenu')
      AND t.status != 'cancelled'
      AND t.date <= v_cur_date;

    v_cash := v_inv - v_purch - v_other + v_rental;
    v_shares := v_inv;

    SELECT COALESCE(SUM(
      COALESCE((
        SELECT SUM(
          CASE WHEN p.currency = 'USD' THEN ABS(t2.amount)
               ELSE ABS(t2.amount) END
        )
        FROM transactions t2
        WHERE t2.property_id = p.id
          AND t2.type IN ('achat_propriete', 'paiement')
          AND t2.status != 'cancelled'
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
            *
            (POWER(
               1.0 + get_property_appreciation_rate(p.id),
               (v_cur_date - GREATEST(COALESCE(p.reservation_date::DATE, p.completion_date::DATE), v_first_invest_date))::NUMERIC / 365.25
             ) - 1.0)
          ELSE 0.0
        END,
        0.0
      )
    ), 0)
    INTO v_prop_val
    FROM properties p
    WHERE p.status IN ('reservation', 'en_construction', 'acquired', 'complete', 'actif', 'en_location');

    v_nav_val := v_cash + v_prop_val;

    IF v_shares > 0 THEN
      v_nav_ps := v_nav_val / v_shares;
    ELSE
      v_nav_ps := 1.0;
    END IF;

    point_date      := v_cur_date;
    nav_per_share   := GREATEST(COALESCE(v_nav_ps, 1.0), 0.5);
    net_asset_value := COALESCE(v_nav_val, 0);
    total_shares    := COALESCE(v_shares, 0);
    v_last_date     := v_cur_date;
    RETURN NEXT;

    v_cur_date := (v_cur_date + INTERVAL '1 month')::DATE;
  END LOOP;

  IF v_last_date IS NULL OR v_last_date < v_end_date THEN
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_inv
    FROM transactions t WHERE t.type = 'investissement' AND t.status != 'cancelled';

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_purch
    FROM transactions t
    WHERE t.type IN ('achat_propriete', 'paiement') AND t.property_id IS NOT NULL
      AND t.status != 'cancelled';

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_other
    FROM transactions t
    WHERE t.type IN ('capex', 'maintenance', 'admin', 'depense', 'remboursement_investisseur')
      AND t.status != 'cancelled';

    -- Revenus : loyer + loyer_locatif + revenu général
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t
    WHERE t.type IN ('loyer', 'loyer_locatif', 'revenu')
      AND t.status != 'cancelled';

    v_cash   := v_inv - v_purch - v_other + v_rental;
    v_shares := v_inv;

    SELECT COALESCE(SUM(
      COALESCE((
        SELECT SUM(ABS(t2.amount))
        FROM transactions t2
        WHERE t2.property_id = p.id AND t2.type IN ('achat_propriete', 'paiement')
          AND t2.status != 'cancelled'
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
          ELSE 0.0 END,
        0.0
      )
    ), 0)
    INTO v_prop_val
    FROM properties p
    WHERE p.status IN ('reservation', 'en_construction', 'acquired', 'complete', 'actif', 'en_location');

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

GRANT EXECUTE ON FUNCTION get_nav_timeline() TO authenticated;

-- ─── 2. Mettre à jour get_financial_summary() ────────────────────────────────
-- La version de migration 109 utilise IN ('investissement', 'loyer', 'dividende')
-- pour le solde compte courant — on ajoute loyer_locatif et revenu

DROP FUNCTION IF EXISTS get_financial_summary(integer);
DROP FUNCTION IF EXISTS get_financial_summary();

CREATE OR REPLACE FUNCTION get_financial_summary(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
  result_category TEXT,
  result_metric    TEXT,
  result_value     NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY

  -- ── Total Investisseurs ─────────────────────────────────────────
  SELECT
    'investissement'::TEXT,
    'Total Investisseurs'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Compte Courant ──────────────────────────────────────────────
  -- Inflows: investissement + loyer + loyer_locatif + revenu + dividende
  -- Outflows: sorties d'argent (ABS)
  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      COALESCE((
        SELECT SUM(ABS(t1.amount)) FROM transactions t1
        WHERE t1.type IN ('investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende')
          AND t1.status != 'cancelled'
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)
      ), 0)
      -
      COALESCE((
        SELECT SUM(ABS(t2.amount)) FROM transactions t2
        WHERE t2.type IN (
            'achat_propriete', 'capex', 'maintenance', 'admin',
            'depense', 'remboursement_investisseur', 'paiement'
          )
          AND t2.status != 'cancelled'
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)
      ), 0)
    )::NUMERIC

  UNION ALL

  -- ── CAPEX Réserve ───────────────────────────────────────────────
  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'capex'
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Dépenses Projets (transactions liées à une propriété) ───────
  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND t.type IN ('achat_propriete', 'capex', 'maintenance', 'admin', 'depense', 'paiement')
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Coûts Opération (dépenses sans propriété) ───────────────────
  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('maintenance', 'admin', 'depense')
    AND t.property_id IS NULL
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

COMMENT ON FUNCTION get_financial_summary(INTEGER) IS
  'KPIs financiers — loyer_locatif et revenu inclus dans les entrées compte courant (migration 116)';

GRANT EXECUTE ON FUNCTION get_financial_summary(INTEGER) TO authenticated;

-- ─── Message ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 116 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  + get_nav_timeline() : loyer_locatif inclus dans revenus';
  RAISE NOTICE '  + get_financial_summary() : loyer_locatif + revenu inclus';
  RAISE NOTICE '  + PropertyFinancialSummary.tsx mis à jour (JS)';
  RAISE NOTICE '  + AdministrationTab.tsx totalIn mis à jour (JS)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
