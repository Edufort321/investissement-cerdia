-- ==========================================
-- MIGRATION 171: FIX DOUBLE COMPTAGE NAV
-- ==========================================
--
-- PROBLÈME:
--   cash_balance = investments - property_purchases - ...
--   CERDIA n'a aucune transaction achat_propriete → property_purchases = 0.
--   cash_balance = 545 841 (tout le capital reste "en caisse")
--   + properties_current_value = 912 717 → NAV = 1 458 558 → nav/part = 2.51 (faux)
--
-- CAUSE RACINE:
--   La formule suppose que le cash déployé en immobilier est capturé par des
--   transactions achat_propriete. En l'absence de ces transactions, le capital
--   investisseur est compté deux fois (cash + valeur marchande des propriétés).
--
-- SOLUTION:
--   Utiliser properties_initial_value (déjà calculé via total_cost des propriétés)
--   pour déduire le capital déployé:
--   cash_balance = investments - properties_initial_value - expenses + rental
--
--   NAV = (investments - initial - costs + rental) + current - liabilities
--       = investments + (current - initial) - costs + rental - liabilities
--       = investments + appreciation - costs + rental - liabilities ✓
--
-- RÉSULTAT CERDIA:
--   properties_initial = 615 168 USD × 1.40 = 861 236 CAD
--   cash_balance = 545 841 - 861 236 = -315 395 (capital net déployé)
--   NAV = -315 395 + 912 717 = 597 322 CAD → nav/part ≈ 1.029
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION 171 — FIX DOUBLE COMPTAGE NAV';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;

DROP FUNCTION IF EXISTS calculate_realistic_nav_v2(DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_realistic_nav_v2(DATE, UUID) CASCADE;

CREATE OR REPLACE FUNCTION calculate_realistic_nav_v2(
  p_target_date DATE    DEFAULT CURRENT_DATE,
  p_org_id      UUID    DEFAULT NULL
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
) LANGUAGE plpgsql AS $$
DECLARE
  v_org                  UUID    := COALESCE(p_org_id, auth_get_org_id());
  v_exchange_rate        DECIMAL(10, 4);
  v_construction_initial DECIMAL(15, 2);
BEGIN
  IF v_org IS DISTINCT FROM auth_get_org_id() AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé: organisation non autorisée';
  END IF;

  SELECT get_current_exchange_rate('USD', 'CAD') INTO v_exchange_rate;
  IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
    v_exchange_rate := 1.40;
  END IF;

  -- Flux de trésorerie (filtrés par org)
  SELECT COALESCE(SUM(t.amount), 0) INTO total_investments
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.organization_id = v_org;

  -- Conservé pour information (non utilisé dans le calcul du cash_balance)
  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO property_purchases
  FROM transactions t
  WHERE t.type = 'achat_propriete'
    AND t.organization_id = v_org;

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO capex_expenses
  FROM transactions t
  WHERE t.type = 'capex'
    AND t.organization_id = v_org;

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO maintenance_expenses
  FROM transactions t
  WHERE t.type = 'maintenance'
    AND t.organization_id = v_org;

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO admin_expenses
  FROM transactions t
  WHERE t.type = 'admin'
    AND t.organization_id = v_org;

  SELECT COALESCE(SUM(t.amount), 0) INTO rental_income
  FROM transactions t
  WHERE t.type IN ('loyer', 'loyer_locatif')
    AND t.organization_id = v_org;

  -- Valeur initiale des propriétés — calculée AVANT cash_balance
  SELECT COALESCE(SUM(
    CASE WHEN pv.currency = 'USD' THEN pv.acquisition_cost * v_exchange_rate
         ELSE pv.acquisition_cost END
  ), 0) INTO properties_initial_value
  FROM property_valuations pv
  WHERE pv.valuation_type = 'initial'
    AND pv.organization_id = v_org;

  -- Fallback: propriétés sans property_valuation initial → utilise total_cost
  SELECT COALESCE(SUM(
    CASE WHEN p.currency = 'USD' THEN p.total_cost * v_exchange_rate
         ELSE p.total_cost END
  ), 0) INTO v_construction_initial
  FROM properties p
  WHERE p.status IN ('reservation','en_construction','acquired','complete','actif','en_location')
    AND p.total_cost > 0
    AND p.organization_id = v_org
    AND NOT EXISTS (
      SELECT 1 FROM property_valuations pv2
      WHERE pv2.property_id = p.id AND pv2.valuation_type = 'initial'
    );

  properties_initial_value := properties_initial_value + COALESCE(v_construction_initial, 0);

  -- cash_balance: capital investi - coût initial des propriétés déployées - dépenses + revenus
  -- Remplace l'ancienne formule (investments - property_purchases) qui supposait
  -- l'existence de transactions achat_propriete pour déduire le capital déployé.
  cash_balance := total_investments - properties_initial_value
                  - capex_expenses - maintenance_expenses
                  - admin_expenses + rental_income;

  -- Valeur courante des propriétés (filtrée par org via property_id)
  SELECT COALESCE(SUM(
    CASE WHEN cpv.currency = 'USD' THEN cpv.current_value * v_exchange_rate
         ELSE cpv.current_value END
  ), 0) INTO properties_current_value
  FROM current_property_values cpv
  WHERE cpv.property_id IN (
    SELECT id FROM properties WHERE organization_id = v_org
  );

  -- NAV
  -- total_assets = cash_balance + current = (inv - initial - costs + rental) + current
  --             = inv + (current - initial) - costs + rental
  --             = inv + appreciation - costs + rental ✓
  properties_appreciation := properties_current_value - properties_initial_value;
  total_assets             := cash_balance + properties_current_value;

  SELECT COALESCE(SUM(
    CASE WHEN l.currency = 'USD' THEN l.principal_amount * v_exchange_rate
         ELSE l.principal_amount END
  ), 0) INTO total_liabilities
  FROM liabilities l
  WHERE l.status = 'active'
    AND l.organization_id = v_org;

  net_asset_value := total_assets - total_liabilities;

  SELECT COALESCE(SUM(number_of_shares), 0) INTO total_shares
  FROM investor_investments
  WHERE organization_id = v_org;

  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.00;
  END IF;

  nav_change_pct := ((nav_per_share - 1.00) / 1.00) * 100;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION calculate_realistic_nav_v2(DATE, UUID) IS
  'NAV v5: évite double comptage — cash_balance utilise properties_initial_value (total_cost) au lieu de transactions achat_propriete';

DO $$
BEGIN
  RAISE NOTICE '✅ calculate_realistic_nav_v2 recréée (fix double comptage)';
END $$;

-- Vues dépendantes (supprimées par CASCADE ci-dessus)

CREATE OR REPLACE VIEW realistic_nav_current_v2 AS
SELECT * FROM calculate_realistic_nav_v2(CURRENT_DATE);

COMMENT ON VIEW realistic_nav_current_v2 IS
  'Vue du NAV actuel (calculate_realistic_nav_v2 v5) — org du user connecté';

CREATE OR REPLACE VIEW v_nav_summary AS
SELECT
  current_nav.net_asset_value          AS current_nav,
  current_nav.nav_per_share            AS current_nav_per_share,
  current_nav.properties_appreciation  AS current_appreciation,

  last_snapshot.snapshot_date          AS last_snapshot_date,
  last_snapshot.nav_per_share          AS last_snapshot_nav_per_share,

  first_snapshot.snapshot_date         AS first_snapshot_date,
  first_snapshot.nav_per_share         AS first_snapshot_nav_per_share,

  CASE
    WHEN first_snapshot.nav_per_share > 0 THEN
      ((current_nav.nav_per_share - first_snapshot.nav_per_share)
       / first_snapshot.nav_per_share * 100)
    ELSE NULL
  END AS total_performance_pct,

  CASE
    WHEN last_snapshot.nav_per_share > 0 THEN
      ((current_nav.nav_per_share - last_snapshot.nav_per_share)
       / last_snapshot.nav_per_share * 100)
    ELSE NULL
  END AS since_last_snapshot_pct,

  current_nav.total_investments,
  current_nav.properties_current_value,
  (SELECT COUNT(*) FROM nav_history WHERE organization_id = auth_get_org_id()) AS total_snapshots,
  (SELECT MAX(snapshot_date) FROM nav_history WHERE organization_id = auth_get_org_id()) AS latest_snapshot_date

FROM calculate_realistic_nav_v2(CURRENT_DATE) current_nav
CROSS JOIN LATERAL (
  SELECT * FROM nav_history WHERE organization_id = auth_get_org_id() ORDER BY snapshot_date DESC LIMIT 1
) last_snapshot
CROSS JOIN LATERAL (
  SELECT * FROM nav_history WHERE organization_id = auth_get_org_id() ORDER BY snapshot_date ASC LIMIT 1
) first_snapshot;

COMMENT ON VIEW v_nav_summary IS
  'Résumé NAV actuel + comparaison historique — org du user connecté';

DO $$
BEGIN
  RAISE NOTICE '✅ realistic_nav_current_v2 et v_nav_summary recréées';
END $$;

DROP VIEW IF EXISTS investor_performance_metrics;

CREATE VIEW investor_performance_metrics
WITH (security_invoker = true)
AS
WITH
  invested AS (
    SELECT
      ii.investor_id,
      SUM(ii.amount_invested)    AS total_invested,
      MIN(ii.investment_date)    AS first_investment_date,
      SUM(ii.number_of_shares)   AS total_shares
    FROM investor_investments ii
    WHERE ii.status = 'active'
      AND ii.organization_id = auth_get_org_id()
    GROUP BY ii.investor_id
  ),
  distributions AS (
    SELECT
      t.investor_id,
      COALESCE(SUM(ABS(t.amount)), 0) AS total_distributions
    FROM transactions t
    WHERE t.type IN ('remboursement_investisseur', 'dividende')
      AND t.status != 'cancelled'
      AND t.investor_id IS NOT NULL
      AND t.organization_id = auth_get_org_id()
    GROUP BY t.investor_id
  ),
  nav_data AS (
    SELECT nav_per_share
    FROM calculate_realistic_nav_v2(p_org_id => auth_get_org_id())
    LIMIT 1
  )
SELECT
  i.id                                                              AS investor_id,
  i.organization_id                                                 AS organization_id,
  i.first_name || ' ' || i.last_name                               AS investor_name,
  COALESCE(inv.total_invested, 0)                                   AS total_invested,
  COALESCE(inv.total_shares, 0)                                     AS total_shares,
  COALESCE(inv.first_investment_date, CURRENT_DATE)                 AS first_investment_date,
  COALESCE(d.total_distributions, 0)                               AS total_distributions,
  ROUND(COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1), 2)
                                                                   AS current_portfolio_value,
  CASE WHEN COALESCE(inv.total_invested, 0) > 0
    THEN ROUND(
      (COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1) + COALESCE(d.total_distributions, 0))
      / inv.total_invested, 3)
    ELSE 1.000
  END                                                              AS moic,
  CASE WHEN COALESCE(inv.total_invested, 0) > 0
    THEN ROUND(COALESCE(d.total_distributions, 0) / inv.total_invested, 3)
    ELSE 0.000
  END                                                              AS dpi,
  CASE WHEN COALESCE(inv.total_invested, 0) > 0
    THEN ROUND(
      COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1)
      / inv.total_invested, 3)
    ELSE 1.000
  END                                                              AS rvpi,
  CASE
    WHEN COALESCE(inv.total_invested, 0) > 0
     AND inv.first_investment_date IS NOT NULL
     AND (CURRENT_DATE - inv.first_investment_date) > 365
    THEN ROUND((
      POWER(
        GREATEST(
          (COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1)
            + COALESCE(d.total_distributions, 0))
          / NULLIF(inv.total_invested, 0),
          0.001
        ),
        1.0 / GREATEST(
          (CURRENT_DATE - inv.first_investment_date)::numeric / 365.25,
          0.01
        )
      ) - 1
    ) * 100, 2)
    ELSE NULL
  END                                                              AS annualized_return_pct,
  ROUND(
    COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1)
    - COALESCE(inv.total_invested, 0), 2)                         AS unrealized_gain
FROM investors i
LEFT JOIN invested    inv ON inv.investor_id = i.id
LEFT JOIN distributions d ON d.investor_id  = i.id
CROSS JOIN nav_data n
WHERE i.organization_id = auth_get_org_id()
  AND i.access_level != 'admin'
ORDER BY COALESCE(inv.total_invested, 0) DESC;

COMMENT ON VIEW investor_performance_metrics IS
  'Métriques LP tenant-aware: MOIC/DPI/RVPI avec NAV v5 (sans double comptage)';

DO $$
BEGIN
  RAISE NOTICE '✅ investor_performance_metrics recréée (NAV v5)';
END $$;

SELECT
  '✅ MIGRATION 171 — FIX DOUBLE COMPTAGE NAV' AS status,
  'cash_balance utilise properties_initial_value (total_cost) au lieu de property_purchases' AS fix,
  'nav/part attendu CERDIA: ~1.029 (vs 2.456 avant)' AS expected;
