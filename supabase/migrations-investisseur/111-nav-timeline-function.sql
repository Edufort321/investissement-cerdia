-- Migration 111: Fonction get_nav_timeline() pour graphique historique NAV
-- Génère des points de données mensuels depuis la première transaction jusqu'à aujourd'hui.
-- Chaque point appelle calculate_realistic_nav_v2(date) pour refléter le NAV à cette date.

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
  v_nav        RECORD;
  v_last_date  DATE;
BEGIN
  -- Trouver la date de la première transaction active
  SELECT MIN(transaction_date) INTO v_start_date
  FROM transactions
  WHERE status != 'cancelled';

  IF v_start_date IS NULL THEN RETURN; END IF;

  -- Commencer au 1er du mois de la première transaction
  v_cur_date  := DATE_TRUNC('month', v_start_date)::DATE;
  v_last_date := NULL;

  -- Points mensuels jusqu'à aujourd'hui
  WHILE v_cur_date <= v_end_date LOOP
    SELECT r.nav_per_share, r.net_asset_value, r.total_shares
    INTO v_nav
    FROM calculate_realistic_nav_v2(v_cur_date) r
    LIMIT 1;

    IF v_nav.total_shares IS NOT NULL AND v_nav.total_shares > 0 THEN
      point_date      := v_cur_date;
      nav_per_share   := COALESCE(v_nav.nav_per_share, 1.0);
      net_asset_value := COALESCE(v_nav.net_asset_value, 0);
      total_shares    := COALESCE(v_nav.total_shares, 0);
      v_last_date     := v_cur_date;
      RETURN NEXT;
    END IF;

    v_cur_date := (v_cur_date + INTERVAL '1 month')::DATE;
  END LOOP;

  -- Toujours ajouter aujourd'hui comme dernier point temps réel (si pas déjà inclus)
  IF v_last_date IS NULL OR v_last_date < v_end_date THEN
    SELECT r.nav_per_share, r.net_asset_value, r.total_shares
    INTO v_nav
    FROM calculate_realistic_nav_v2(v_end_date) r
    LIMIT 1;

    IF v_nav.total_shares IS NOT NULL AND v_nav.total_shares > 0 THEN
      point_date      := v_end_date;
      nav_per_share   := COALESCE(v_nav.nav_per_share, 1.0);
      net_asset_value := COALESCE(v_nav.net_asset_value, 0);
      total_shares    := COALESCE(v_nav.total_shares, 0);
      RETURN NEXT;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_nav_timeline() TO authenticated;
