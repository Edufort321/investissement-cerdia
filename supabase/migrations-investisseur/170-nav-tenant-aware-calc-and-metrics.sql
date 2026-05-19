-- ==========================================
-- MIGRATION 170: TENANT-AWARE NAV CALCULATION + INVESTOR METRICS
-- ==========================================
--
-- PROBLÈME:
--   calculate_realistic_nav_v2() ne filtre pas par organization_id.
--   Comme Eric est super_admin (bypasse RESTRICTIVE RLS), la fonction
--   calcule le NAV en cumulant CERDIA + DEMO, ce qui:
--   a) donne un nav_per_share incorrect (2x les données)
--   b) fait crasher investor_performance_metrics via POWER(negative, fraction)
--      quand les valeurs mélangées produisent une base négative
--
-- SOLUTION:
--   1. Ajouter p_org_id à calculate_realistic_nav_v2 (même pattern que mig 165)
--   2. Recréer investor_performance_metrics avec filtre org + security_invoker
--
-- Formule de base : mig 121 (dernière version de la fonction)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRATION 170 — NAV + METRICS TENANT-AWARE';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- 1. RECRÉER calculate_realistic_nav_v2 AVEC p_org_id
-- ==========================================

DROP FUNCTION IF EXISTS calculate_realistic_nav_v2(DATE);
DROP FUNCTION IF EXISTS calculate_realistic_nav_v2(DATE, UUID);

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
  -- Garde-fou tenant (super_admin uniquement peut passer un org_id différent)
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

  cash_balance := total_investments - property_purchases
                  - capex_expenses - maintenance_expenses
                  - admin_expenses + rental_income;

  -- Valeur initiale des propriétés (filtrées par org)
  SELECT COALESCE(SUM(
    CASE WHEN pv.currency = 'USD' THEN pv.acquisition_cost * v_exchange_rate
         ELSE pv.acquisition_cost END
  ), 0) INTO properties_initial_value
  FROM property_valuations pv
  WHERE pv.valuation_type = 'initial'
    AND pv.organization_id = v_org;

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

  -- Valeur courante des propriétés (vue sans org_id → filtre via property_id)
  SELECT COALESCE(SUM(
    CASE WHEN cpv.currency = 'USD' THEN cpv.current_value * v_exchange_rate
         ELSE cpv.current_value END
  ), 0) INTO properties_current_value
  FROM current_property_values cpv
  WHERE cpv.property_id IN (
    SELECT id FROM properties WHERE organization_id = v_org
  );

  -- NAV
  properties_appreciation := properties_current_value - properties_initial_value;
  total_assets             := cash_balance + properties_current_value;

  -- Passifs réels (filtrés par org)
  SELECT COALESCE(SUM(
    CASE WHEN l.currency = 'USD' THEN l.principal_amount * v_exchange_rate
         ELSE l.principal_amount END
  ), 0) INTO total_liabilities
  FROM liabilities l
  WHERE l.status = 'active'
    AND l.organization_id = v_org;

  net_asset_value := total_assets - total_liabilities;

  -- Parts totales (filtrées par org)
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
  'NAV v4: passifs réels + filtre tenant (p_org_id, défaut = org du user connecté)';

DO $$
BEGIN
  RAISE NOTICE '✅ calculate_realistic_nav_v2 recréée avec p_org_id';
END $$;

-- ==========================================
-- 2. RECRÉER investor_performance_metrics AVEC FILTRE ORG
-- ==========================================

DROP VIEW IF EXISTS investor_performance_metrics;

CREATE VIEW investor_performance_metrics
WITH (security_invoker = true)
AS
WITH
  -- Capital investi par investisseur (org courante uniquement)
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

  -- Distributions reçues (org courante uniquement)
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

  -- NAV actuel par part (org courante uniquement)
  nav_data AS (
    SELECT nav_per_share
    FROM calculate_realistic_nav_v2(p_org_id => auth_get_org_id())
    LIMIT 1
  )

SELECT
  i.id                                                              AS investor_id,
  i.organization_id                                                 AS organization_id,
  i.first_name || ' ' || i.last_name                              AS investor_name,
  COALESCE(inv.total_invested, 0)                                  AS total_invested,
  COALESCE(inv.total_shares, 0)                                    AS total_shares,
  COALESCE(inv.first_investment_date, CURRENT_DATE)                AS first_investment_date,
  COALESCE(d.total_distributions, 0)                               AS total_distributions,

  -- Valeur actuelle du portefeuille au NAV
  ROUND(COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1), 2)
                                                                   AS current_portfolio_value,

  -- MOIC = (Valeur actuelle + Distributions) / Capital investi
  CASE WHEN COALESCE(inv.total_invested, 0) > 0
    THEN ROUND(
      (COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1) + COALESCE(d.total_distributions, 0))
      / inv.total_invested, 3)
    ELSE 1.000
  END                                                              AS moic,

  -- DPI = Distributions / Capital investi
  CASE WHEN COALESCE(inv.total_invested, 0) > 0
    THEN ROUND(COALESCE(d.total_distributions, 0) / inv.total_invested, 3)
    ELSE 0.000
  END                                                              AS dpi,

  -- RVPI = Valeur résiduelle / Capital investi
  CASE WHEN COALESCE(inv.total_invested, 0) > 0
    THEN ROUND(
      COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1)
      / inv.total_invested, 3)
    ELSE 1.000
  END                                                              AS rvpi,

  -- Rendement annualisé simple = (MOIC^(1/années) - 1) × 100
  -- PROTECTION: base POWER garantie > 0 via GREATEST(..., 0.001)
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
          0.001  -- éviter base négative ou zéro → POWER error
        ),
        1.0 / GREATEST(
          (CURRENT_DATE - inv.first_investment_date)::numeric / 365.25,
          0.01
        )
      ) - 1
    ) * 100, 2)
    ELSE NULL
  END                                                              AS annualized_return_pct,

  -- Gain / perte non réalisé
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
  'Métriques LP tenant-aware: MOIC, DPI, RVPI, rendement annualisé, gain non réalisé. security_invoker + filtre org.';

DO $$
BEGIN
  RAISE NOTICE '✅ investor_performance_metrics recrée (tenant-aware, security_invoker, POWER protégé)';
END $$;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
SELECT
  '✅ MIGRATION 170 — NAV TENANT-AWARE + METRICS SÉCURISÉES' AS status,
  'calculate_realistic_nav_v2(DATE, UUID) + filtre org sur toutes les tables' AS fn,
  'investor_performance_metrics WITH security_invoker + POWER(GREATEST(...,0.001))' AS view;
