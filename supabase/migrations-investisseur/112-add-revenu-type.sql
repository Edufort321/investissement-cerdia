-- Migration 112: Ajouter le type 'revenu' aux transactions
--
-- NOUVEAU TYPE: 'revenu' — revenu général (entrée d'argent)
-- Traité comme 'loyer' dans le calcul NAV (cash income)

-- 1. Mettre à jour la contrainte
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    -- ENTRÉES D'ARGENT (montant positif)
    'investissement',           -- Investisseur achète des parts
    'loyer',                    -- Revenus locatifs
    'dividende',                -- Distribution de profits
    'revenu',                   -- Revenu général (NOUVEAU)

    -- SORTIES D'ARGENT (montant négatif)
    'paiement',                 -- Paiement général
    'achat_propriete',          -- Achat de propriété
    'depense',                  -- Dépense générale
    'capex',                    -- Amélioration propriété
    'maintenance',              -- Entretien propriété
    'admin',                    -- Frais administratifs
    'remboursement_investisseur', -- Remboursement investisseur
    'courant',                  -- Compte courant
    'rnd'                       -- Recherche & développement
  ));

-- 2. Mettre à jour get_nav_timeline() pour inclure 'revenu' dans le cash
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

    -- Revenus : loyer + revenu général
    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t
    WHERE t.type IN ('loyer', 'revenu') AND t.status != 'cancelled' AND t.date <= v_cur_date;

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

    SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO v_rental
    FROM transactions t WHERE t.type IN ('loyer', 'revenu') AND t.status != 'cancelled';

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
