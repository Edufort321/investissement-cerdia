-- ==========================================
-- MIGRATION 121: PASSIFS (LIABILITIES) + MÉTRIQUES INVESTISSEUR
-- ==========================================
-- 1. Table liabilities (hypothèques, prêts)
-- 2. update calculate_realistic_nav_v2 pour lire les passifs réels
-- 3. Vue investor_performance_metrics (MOIC, DPI, rendement annualisé)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 121: PASSIFS + MÉTRIQUES INVESTISSEUR';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- 1. TABLE LIABILITIES
-- ==========================================

CREATE TABLE IF NOT EXISTS liabilities (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id      UUID REFERENCES properties(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  lender           TEXT,
  principal_amount DECIMAL(15, 2) NOT NULL CHECK (principal_amount >= 0),
  currency         TEXT NOT NULL DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD')),
  interest_rate    DECIMAL(6, 4),           -- ex: 0.0525 = 5.25%
  start_date       DATE,
  end_date         DATE,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paid_off', 'refinanced')),
  notes            TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liabilities_property_id ON liabilities(property_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_status      ON liabilities(status);

ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage liabilities"
  ON liabilities FOR ALL
  USING (EXISTS (
    SELECT 1 FROM investors WHERE investors.user_id = auth.uid()
      AND investors.access_level = 'admin'
  ));

CREATE POLICY "Investors view liabilities"
  ON liabilities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM investors WHERE investors.user_id = auth.uid()
  ));

COMMENT ON TABLE liabilities IS
  'Passifs du fonds: hypothèques, prêts, dettes (déduits du NAV)';

DO $$
BEGIN
  RAISE NOTICE '✅ Table liabilities créée';
END $$;

-- ==========================================
-- 2. MISE À JOUR calculate_realistic_nav_v2
--    — lit total_liabilities depuis la table
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_realistic_nav_v2(
  p_target_date DATE DEFAULT CURRENT_DATE
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
) AS $$
DECLARE
  v_exchange_rate        DECIMAL(10, 4);
  v_construction_initial DECIMAL(15, 2);
BEGIN
  SELECT get_current_exchange_rate('USD', 'CAD') INTO v_exchange_rate;
  IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
    v_exchange_rate := 1.40;
  END IF;

  -- Flux de trésorerie
  SELECT COALESCE(SUM(t.amount), 0) INTO total_investments
  FROM transactions t WHERE t.type = 'investissement';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO property_purchases
  FROM transactions t WHERE t.type = 'achat_propriete';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO capex_expenses
  FROM transactions t WHERE t.type = 'capex';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO maintenance_expenses
  FROM transactions t WHERE t.type = 'maintenance';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO admin_expenses
  FROM transactions t WHERE t.type = 'admin';

  SELECT COALESCE(SUM(t.amount), 0) INTO rental_income
  FROM transactions t WHERE t.type IN ('loyer', 'loyer_locatif');

  cash_balance := total_investments - property_purchases
                  - capex_expenses - maintenance_expenses
                  - admin_expenses + rental_income;

  -- Valeur propriétés
  SELECT COALESCE(SUM(
    CASE WHEN pv.currency = 'USD' THEN pv.acquisition_cost * v_exchange_rate
         ELSE pv.acquisition_cost END
  ), 0) INTO properties_initial_value
  FROM property_valuations pv WHERE pv.valuation_type = 'initial';

  SELECT COALESCE(SUM(
    CASE WHEN p.currency = 'USD' THEN p.total_cost * v_exchange_rate
         ELSE p.total_cost END
  ), 0) INTO v_construction_initial
  FROM properties p
  WHERE p.status IN ('reservation','en_construction','acquired','complete','actif','en_location')
    AND p.total_cost > 0
    AND NOT EXISTS (
      SELECT 1 FROM property_valuations pv2
      WHERE pv2.property_id = p.id AND pv2.valuation_type = 'initial'
    );

  properties_initial_value := properties_initial_value + COALESCE(v_construction_initial, 0);

  SELECT COALESCE(SUM(
    CASE WHEN cpv.currency = 'USD' THEN cpv.current_value * v_exchange_rate
         ELSE cpv.current_value END
  ), 0) INTO properties_current_value
  FROM current_property_values cpv;

  -- NAV
  properties_appreciation := properties_current_value - properties_initial_value;
  total_assets             := cash_balance + properties_current_value;

  -- Passifs réels depuis la table liabilities
  SELECT COALESCE(SUM(
    CASE WHEN l.currency = 'USD' THEN l.principal_amount * v_exchange_rate
         ELSE l.principal_amount END
  ), 0) INTO total_liabilities
  FROM liabilities l
  WHERE l.status = 'active';

  net_asset_value := total_assets - total_liabilities;

  SELECT COALESCE(SUM(number_of_shares), 0) INTO total_shares
  FROM investor_investments;

  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.00;
  END IF;

  nav_change_pct := ((nav_per_share - 1.00) / 1.00) * 100;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_realistic_nav_v2 IS
  'NAV complet v3: passifs réels depuis table liabilities, conversion USD/CAD';

DO $$
BEGIN
  RAISE NOTICE '✅ calculate_realistic_nav_v2 mis à jour (passifs réels)';
END $$;

-- ==========================================
-- 3. VUE investor_performance_metrics
--    MOIC, DPI, rendement annualisé simple
-- ==========================================

CREATE OR REPLACE VIEW investor_performance_metrics AS
WITH
  -- Capital investi par investisseur
  invested AS (
    SELECT
      ii.investor_id,
      SUM(ii.amount_invested)    AS total_invested,
      MIN(ii.investment_date)    AS first_investment_date,
      SUM(ii.number_of_shares)   AS total_shares
    FROM investor_investments ii
    WHERE ii.status = 'active'
    GROUP BY ii.investor_id
  ),

  -- Distributions reçues (remboursements + dividendes)
  distributions AS (
    SELECT
      t.investor_id,
      COALESCE(SUM(ABS(t.amount)), 0) AS total_distributions
    FROM transactions t
    WHERE t.type IN ('remboursement_investisseur', 'dividende')
      AND t.status != 'cancelled'
      AND t.investor_id IS NOT NULL
    GROUP BY t.investor_id
  ),

  -- NAV actuel par part
  nav_data AS (
    SELECT nav_per_share FROM calculate_realistic_nav_v2()
    LIMIT 1
  )

SELECT
  i.id                                                              AS investor_id,
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
  CASE
    WHEN COALESCE(inv.total_invested, 0) > 0
     AND inv.first_investment_date IS NOT NULL
     AND (CURRENT_DATE - inv.first_investment_date) > 365
    THEN ROUND((
      POWER(
        (COALESCE(inv.total_shares, 0) * COALESCE(n.nav_per_share, 1)
          + COALESCE(d.total_distributions, 0))
        / inv.total_invested,
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
WHERE i.access_level != 'admin'   -- exclure l'admin du fonds lui-même
ORDER BY COALESCE(inv.total_invested, 0) DESC;

COMMENT ON VIEW investor_performance_metrics IS
  'Métriques LP: MOIC, DPI, RVPI, rendement annualisé, gain non réalisé';

DO $$
BEGIN
  RAISE NOTICE '✅ Vue investor_performance_metrics créée (MOIC, DPI, RVPI, rendement annualisé)';
END $$;

-- ==========================================
-- 4. TABLE audit_log (traçabilité)
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  action        TEXT NOT NULL,   -- 'CREATE' | 'UPDATE' | 'DELETE'
  table_name    TEXT NOT NULL,
  record_id     TEXT,
  changes       JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name  ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id     ON audit_log(user_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log"
  ON audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM investors WHERE investors.user_id = auth.uid()
      AND investors.access_level = 'admin'
  ));

CREATE POLICY "System insert audit log"
  ON audit_log FOR INSERT WITH CHECK (true);

COMMENT ON TABLE audit_log IS
  'Journal d''audit: toutes les actions sensibles (qui, quand, quoi)';

DO $$
BEGIN
  RAISE NOTICE '✅ Table audit_log créée';
END $$;

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

DO $$
DECLARE
  v_nav RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION MIGRATION 121';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';

  SELECT * FROM calculate_realistic_nav_v2() INTO v_nav;
  RAISE NOTICE '  NAV actuel:       %$', v_nav.net_asset_value;
  RAISE NOTICE '  Passifs réels:    %$', v_nav.total_liabilities;
  RAISE NOTICE '  NAV/part:         %$', v_nav.nav_per_share;
  RAISE NOTICE '  Variation NAV:    %%', v_nav.nav_change_pct;

  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 121 TERMINÉE — Liabilities + NAV réel + MOIC/DPI/RVPI + Audit log' AS status;
