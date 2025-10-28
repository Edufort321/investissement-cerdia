-- ==========================================
-- MIGRATION 85: CORRIGER NAV - UTILISER BON SCHÉMA property_valuations
-- Les migrations 81 et 84 utilisaient des colonnes inexistantes
-- ==========================================

-- PROBLÈME:
-- Migration 81 utilise "valuation_amount" qui n'existe pas
-- Migration 84 utilise "valuation_amount" qui n'existe pas
-- La vraie table property_valuations (migration 49) a:
--   - acquisition_cost
--   - current_market_value
--   - estimated_value

-- SOLUTION:
-- Recréer les fonctions avec les bonnes colonnes

-- ==========================================
-- 1. CORRIGER: auto_create_initial_valuation
-- ==========================================

CREATE OR REPLACE FUNCTION auto_create_initial_valuation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'acquired' AND (OLD.status IS NULL OR OLD.status != 'acquired') THEN
    IF NOT EXISTS (
      SELECT 1 FROM property_valuations
      WHERE property_id = NEW.id
        AND valuation_type = 'initial'
    ) THEN
      -- Créer l'évaluation initiale avec les BONNES colonnes
      INSERT INTO property_valuations (
        property_id,
        valuation_date,
        valuation_type,
        acquisition_cost,
        current_market_value,
        valuation_method,
        appraiser_name,
        notes
      ) VALUES (
        NEW.id,
        COALESCE(NEW.reservation_date, NEW.completion_date, CURRENT_DATE),
        'initial',
        NEW.total_cost, -- Coût d'acquisition
        NEW.total_cost, -- Valeur marchande initiale = prix d'achat
        'purchase_price',
        'Système automatique',
        CONCAT('Évaluation initiale automatique au moment de l''achat - Propriété: ', NEW.name)
      );

      RAISE NOTICE '✅ Évaluation initiale créée pour propriété %: % USD',
        NEW.name, NEW.total_cost;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_initial_valuation IS
  'Crée automatiquement une évaluation initiale quand une propriété est acquise (CORRIGÉ)';

-- ==========================================
-- 2. CORRIGER: calculate_property_value_with_appreciation
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_property_value_with_appreciation(
  p_property_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_initial_valuation RECORD;
  v_years_elapsed DECIMAL(10, 4);
  v_appreciation_rate DECIMAL(5, 4) := 0.08; -- 8% annuel
  v_current_value DECIMAL(15, 2);
BEGIN
  -- Récupérer l'évaluation initiale avec les BONNES colonnes
  SELECT
    valuation_date,
    acquisition_cost,
    current_market_value
  INTO v_initial_valuation
  FROM property_valuations
  WHERE property_id = p_property_id
    AND valuation_type = 'initial'
  ORDER BY valuation_date ASC
  LIMIT 1;

  IF v_initial_valuation IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculer le nombre d'années écoulées
  v_years_elapsed := EXTRACT(EPOCH FROM (p_target_date - v_initial_valuation.valuation_date)) / (365.25 * 24 * 3600);

  IF v_years_elapsed < 0 THEN
    RETURN v_initial_valuation.acquisition_cost;
  END IF;

  -- Formule de l'appréciation composée: V = V0 × (1 + r)^t
  v_current_value := v_initial_valuation.acquisition_cost * POWER(1 + v_appreciation_rate, v_years_elapsed);

  RETURN v_current_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_property_value_with_appreciation IS
  'Calcule la valeur actuelle d''une propriété avec appréciation 8% annuelle (CORRIGÉ)';

-- ==========================================
-- 3. CORRIGER: current_property_values
-- ==========================================

CREATE OR REPLACE VIEW current_property_values AS
SELECT
  p.id as property_id,
  p.name as property_name,
  p.total_cost as acquisition_cost,
  COALESCE(p.reservation_date, p.completion_date) as acquisition_date,

  -- Évaluation initiale
  pv.acquisition_cost as initial_acquisition_cost,
  pv.current_market_value as initial_market_value,
  pv.valuation_date as initial_valuation_date,

  -- Valeur actuelle avec appréciation 8%
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE) as current_value,

  -- Calculs
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(p.reservation_date, p.completion_date, pv.valuation_date))) as years_held,
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - pv.acquisition_cost as appreciation_amount,

  -- Taux d'appréciation réalisé
  CASE
    WHEN pv.acquisition_cost > 0 THEN
      ((calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - pv.acquisition_cost) / pv.acquisition_cost) * 100
    ELSE 0
  END as appreciation_percentage,

  p.status,
  p.currency

FROM properties p
LEFT JOIN property_valuations pv ON p.id = pv.property_id AND pv.valuation_type = 'initial'
WHERE p.status IN ('acquired', 'complete', 'en_location')
ORDER BY COALESCE(p.reservation_date, p.completion_date) DESC;

COMMENT ON VIEW current_property_values IS
  'Vue des valeurs actuelles des propriétés avec appréciation 8% annuelle (CORRIGÉ)';

-- ==========================================
-- 4. CORRIGER: calculate_realistic_nav_v2
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_realistic_nav_v2(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  -- Flux de trésorerie
  total_investments DECIMAL(15, 2),
  property_purchases DECIMAL(15, 2),
  capex_expenses DECIMAL(15, 2),
  maintenance_expenses DECIMAL(15, 2),
  admin_expenses DECIMAL(15, 2),
  rental_income DECIMAL(15, 2),

  -- Solde de trésorerie
  cash_balance DECIMAL(15, 2),

  -- Propriétés
  properties_initial_value DECIMAL(15, 2),
  properties_current_value DECIMAL(15, 2),
  properties_appreciation DECIMAL(15, 2),

  -- NAV
  total_assets DECIMAL(15, 2),
  total_liabilities DECIMAL(15, 2),
  net_asset_value DECIMAL(15, 2),
  total_shares DECIMAL(15, 4),
  nav_per_share DECIMAL(10, 4),

  -- Performance
  nav_change_pct DECIMAL(10, 4)
) AS $$
DECLARE
  v_exchange_rate DECIMAL(10, 4);
BEGIN
  -- Récupérer le taux de change actuel USD → CAD
  SELECT get_current_exchange_rate('USD', 'CAD') INTO v_exchange_rate;
  IF v_exchange_rate IS NULL THEN
    v_exchange_rate := 1.40;
  END IF;

  -- 1. FLUX DE TRÉSORERIE

  -- Total investi
  SELECT COALESCE(SUM(amount), 0)
  INTO total_investments
  FROM transactions
  WHERE type = 'investissement';

  -- Argent dépensé pour propriétés
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO property_purchases
  FROM transactions
  WHERE type = 'investissement' AND property_id IS NOT NULL;

  -- CAPEX
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO capex_expenses
  FROM transactions
  WHERE type = 'capex';

  -- Maintenance
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO maintenance_expenses
  FROM transactions
  WHERE type = 'maintenance';

  -- Administration
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO admin_expenses
  FROM transactions
  WHERE type = 'admin';

  -- Revenus locatifs
  SELECT COALESCE(SUM(amount), 0)
  INTO rental_income
  FROM transactions
  WHERE type = 'loyer';

  -- 2. SOLDE DE TRÉSORERIE
  cash_balance := total_investments
                  - property_purchases
                  - capex_expenses
                  - maintenance_expenses
                  - admin_expenses
                  + rental_income;

  -- 3. VALEUR DES PROPRIÉTÉS

  -- Valeur initiale (prix d'achat en CAD)
  SELECT COALESCE(SUM(acquisition_cost * v_exchange_rate), 0)
  INTO properties_initial_value
  FROM property_valuations
  WHERE valuation_type = 'initial';

  -- Valeur actuelle avec appréciation 8%
  SELECT COALESCE(SUM(current_value * v_exchange_rate), 0)
  INTO properties_current_value
  FROM current_property_values;

  -- Gain d'appréciation
  properties_appreciation := properties_current_value - properties_initial_value;

  -- 4. ACTIFS TOTAUX
  total_assets := cash_balance + properties_current_value;

  -- 5. PASSIFS
  total_liabilities := 0;

  -- 6. NAV
  net_asset_value := total_assets - total_liabilities;

  -- 7. PARTS TOTALES
  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO total_shares
  FROM investor_investments;

  -- 8. NAV PAR PART
  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.00;
  END IF;

  -- 9. PERFORMANCE
  nav_change_pct := ((nav_per_share - 1.00) / 1.00) * 100;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_realistic_nav_v2 IS
  'Calcule le NAV réaliste avec les bonnes colonnes de property_valuations (CORRIGÉ)';

-- ==========================================
-- 5. VUE CORRIGÉE
-- ==========================================

CREATE OR REPLACE VIEW realistic_nav_current_v2 AS
SELECT * FROM calculate_realistic_nav_v2(CURRENT_DATE);

COMMENT ON VIEW realistic_nav_current_v2 IS
  'Vue du NAV actuel calculé de manière réaliste (version corrigée utilisant bon schéma)';

-- ==========================================
-- 6. TEST
-- ==========================================

DO $$
DECLARE
  v_nav RECORD;
  v_cash_flow RECORD;
  v_appreciation_pct DECIMAL(10, 2);
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📊 TEST DU CALCUL NAV RÉALISTE (SCHÉMA CORRIGÉ)';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Afficher les flux de trésorerie
  RAISE NOTICE '💰 FLUX DE TRÉSORERIE:';
  RAISE NOTICE '';
  FOR v_cash_flow IN
    SELECT * FROM cash_flow_summary ORDER BY category
  LOOP
    RAISE NOTICE '  %: % $ CAD (% transactions)',
      v_cash_flow.category,
      v_cash_flow.total_cad,
      v_cash_flow.nb_transactions;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE '────────────────────────────────────────────────────';
  RAISE NOTICE '';

  -- Calculer et afficher le NAV
  SELECT * INTO v_nav FROM calculate_realistic_nav_v2(CURRENT_DATE);

  RAISE NOTICE '📈 CALCUL NAV:';
  RAISE NOTICE '';
  RAISE NOTICE 'ENTRÉES:';
  RAISE NOTICE '  Investissements totaux: % $ CAD', v_nav.total_investments;
  RAISE NOTICE '  Revenus locatifs: % $ CAD', v_nav.rental_income;
  RAISE NOTICE '';
  RAISE NOTICE 'SORTIES:';
  RAISE NOTICE '  Achats propriétés: % $ CAD', v_nav.property_purchases;
  RAISE NOTICE '  CAPEX: % $ CAD', v_nav.capex_expenses;
  RAISE NOTICE '  Maintenance: % $ CAD', v_nav.maintenance_expenses;
  RAISE NOTICE '  Administration: % $ CAD', v_nav.admin_expenses;
  RAISE NOTICE '';
  RAISE NOTICE 'TRÉSORERIE:';
  RAISE NOTICE '  Solde compte courant: % $ CAD', v_nav.cash_balance;
  RAISE NOTICE '';
  RAISE NOTICE 'PROPRIÉTÉS:';
  RAISE NOTICE '  Valeur initiale: % $ CAD', v_nav.properties_initial_value;
  RAISE NOTICE '  Valeur actuelle: % $ CAD', v_nav.properties_current_value;

  -- Calculer le pourcentage d'appréciation
  IF v_nav.properties_initial_value > 0 THEN
    v_appreciation_pct := (v_nav.properties_appreciation / v_nav.properties_initial_value * 100);
  ELSE
    v_appreciation_pct := 0;
  END IF;

  RAISE NOTICE '  Appréciation: % $ CAD (% %%)', v_nav.properties_appreciation, v_appreciation_pct;
  RAISE NOTICE '';
  RAISE NOTICE '📊 RÉSULTAT NAV:';
  RAISE NOTICE '  Actifs totaux: % $ CAD', v_nav.total_assets;
  RAISE NOTICE '  Passifs: % $ CAD', v_nav.total_liabilities;
  RAISE NOTICE '  NAV: % $ CAD', v_nav.net_asset_value;
  RAISE NOTICE '';
  RAISE NOTICE '  Parts totales: %', v_nav.total_shares;
  RAISE NOTICE '  NAV par part: % $ CAD', v_nav.nav_per_share;
  RAISE NOTICE '  Performance: % %% (depuis le départ)', v_nav.nav_change_pct;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 85 TERMINÉE' as status,
  'Fonctions NAV corrigées pour utiliser le bon schéma property_valuations' as message;
