-- Migration 111 (v2): Fonction get_nav_timeline() — historique NAV mensuel
--
-- IMPORTANT: calculate_realistic_nav_v2() ignore p_target_date pour les transactions,
-- donc tous les points auraient le même NAV (aujourd'hui). Ce fichier recalcule
-- le NAV inline avec filtre t.date <= point pour chaque mois.
--
-- Modèle par point de date D:
--   investments   = SUM investissements CAD jusqu'à D
--   purchases     = SUM paiements propriétés CAD jusqu'à D
--   other         = SUM capex/maintenance/admin CAD jusqu'à D
--   rental        = SUM loyers CAD jusqu'à D
--   cash          = investments − purchases − other + rental
--   prop_val      = pour chaque propriété, dépôts payés jusqu'à D
--                 + appréciation sur prix_total depuis réservation jusqu'à D
--   total_assets  = cash + prop_val
--   total_shares  = investments (proxy: 1 CAD investi = 1 part à 1.00$)
--   nav_per_share = total_assets / total_shares

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
  v_exchange   NUMERIC;

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
  -- Taux de change USD→CAD
  v_exchange := COALESCE(get_current_exchange_rate('USD', 'CAD'), 1.40);
  IF v_exchange IS NULL OR v_exchange <= 0 THEN v_exchange := 1.40; END IF;

  -- Première transaction active
  SELECT MIN(t.date) INTO v_start_date
  FROM transactions t WHERE t.status != 'cancelled';
  IF v_start_date IS NULL THEN RETURN; END IF;

  v_cur_date  := DATE_TRUNC('month', v_start_date)::DATE;
  v_last_date := NULL;

  WHILE v_cur_date <= v_end_date LOOP

    -- ── 1. Investisseurs ─────────────────────────────────────────────
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_inv
    FROM transactions t
    WHERE t.type = 'investissement' AND t.status != 'cancelled' AND t.date <= v_cur_date;

    -- Sauter si aucun investissement encore
    IF v_inv = 0 THEN
      v_cur_date := (v_cur_date + INTERVAL '1 month')::DATE;
      CONTINUE;
    END IF;

    -- ── 2. Paiements propriétés ──────────────────────────────────────
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_purch
    FROM transactions t
    WHERE t.type IN ('achat_propriete', 'paiement')
      AND t.property_id IS NOT NULL
      AND t.status != 'cancelled'
      AND t.date <= v_cur_date;

    -- ── 3. Autres dépenses ────────────────────────────────────────────
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_other
    FROM transactions t
    WHERE t.type IN ('capex', 'maintenance', 'admin', 'depense', 'remboursement_investisseur')
      AND t.status != 'cancelled'
      AND t.date <= v_cur_date;

    -- ── 4. Revenus locatifs ──────────────────────────────────────────
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t
    WHERE t.type = 'loyer' AND t.status != 'cancelled' AND t.date <= v_cur_date;

    v_cash := v_inv - v_purch - v_other + v_rental;

    -- ── 5. Parts (proxy: 1 CAD investi = 1 part à 1.00 $ initial) ───
    v_shares := v_inv;

    -- ── 6. Valeur des propriétés à la date v_cur_date ────────────────
    --   Phase construction: dépôts_payés_jusqu'à_D + appréciation(prix_total, D)
    SELECT COALESCE(SUM(
      -- Dépôts payés jusqu'à v_cur_date en CAD
      COALESCE((
        SELECT SUM(
          CASE WHEN p.currency = 'USD' THEN
            CASE WHEN t2.exchange_rate > 0 THEN ABS(t2.amount)
                 ELSE ABS(t2.amount)  -- already in CAD from context
            END
          ELSE ABS(t2.amount) END
        )
        FROM transactions t2
        WHERE t2.property_id = p.id
          AND t2.type IN ('achat_propriete', 'paiement')
          AND t2.status != 'cancelled'
          AND t2.date <= v_cur_date
      ), 0)
      +
      -- Appréciation sur le PRIX TOTAL depuis la date de réservation jusqu'à v_cur_date
      GREATEST(
        CASE
          WHEN COALESCE(p.reservation_date::DATE, p.completion_date::DATE) IS NOT NULL
               AND p.total_cost > 0
               AND (v_cur_date - COALESCE(p.reservation_date::DATE, p.completion_date::DATE)) > 0
          THEN
            -- Convertir le prix total en CAD
            (CASE WHEN p.currency = 'USD' THEN p.total_cost * v_exchange ELSE p.total_cost END)
            *
            (POWER(
               1.0 + get_property_appreciation_rate(p.id),
               (v_cur_date - COALESCE(p.reservation_date::DATE, p.completion_date::DATE))::NUMERIC / 365.25
             ) - 1.0)
          ELSE 0.0
        END,
        0.0
      )
    ), 0)
    INTO v_prop_val
    FROM properties p
    WHERE p.status IN ('reservation', 'en_construction', 'acquired', 'complete', 'actif', 'en_location');

    -- ── 7. NAV ────────────────────────────────────────────────────────
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

  -- Toujours ajouter aujourd'hui comme dernier point temps réel
  IF v_last_date IS NULL OR v_last_date < v_end_date THEN
    -- Reprendre le même calcul pour CURRENT_DATE
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

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t WHERE t.type = 'loyer' AND t.status != 'cancelled';

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
               AND (v_end_date - COALESCE(p.reservation_date::DATE, p.completion_date::DATE)) > 0
          THEN
            (CASE WHEN p.currency = 'USD' THEN p.total_cost * v_exchange ELSE p.total_cost END)
            * (POWER(1.0 + get_property_appreciation_rate(p.id),
                (v_end_date - COALESCE(p.reservation_date::DATE, p.completion_date::DATE))::NUMERIC / 365.25
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
