-- ==========================================
-- MIGRATION 84: CORRIGER LE CALCUL DU NAV RÉALISTE
-- Calculer le NAV basé sur les flux de trésorerie RÉELS
-- ==========================================

-- PROBLÈME AVEC LA MIGRATION 81:
-- Le NAV calculé est trop agressif (4.85 $ au lieu de ~1.08 $)
-- Le calcul ne tient pas compte correctement des flux de trésorerie
--
-- OBJECTIF:
-- Calculer un NAV progressif et réaliste:
-- - Année 0: NAV = 1.00 $ (au départ)
-- - Année 1: NAV = ~1.08 $ (avec 8% d'appréciation)
-- - Prendre en compte les VRAIES données:
--   * Investissements réels
--   * Dépenses réelles (achats propriétés, CAPEX)
--   * Revenus locatifs
--   * Appréciation progressive des biens

-- ==========================================
-- 1. VUE: FLUX DE TRÉSORERIE RÉELS
-- ==========================================

-- Vue pour voir tous les flux d'argent
CREATE OR REPLACE VIEW cash_flow_summary AS
SELECT
  'Investissements' as category,
  COALESCE(SUM(amount), 0) as total_cad,
  COUNT(*) as nb_transactions
FROM transactions
WHERE type = 'investissement'

UNION ALL

SELECT
  'Achats propriétés' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions
FROM transactions
WHERE type = 'investissement' AND property_id IS NOT NULL

UNION ALL

SELECT
  'CAPEX' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions
FROM transactions
WHERE type = 'capex'

UNION ALL

SELECT
  'Maintenance' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions
FROM transactions
WHERE type = 'maintenance'

UNION ALL

SELECT
  'Administration' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions
FROM transactions
WHERE type = 'admin'

UNION ALL

SELECT
  'Revenus locatifs' as category,
  COALESCE(SUM(amount), 0) as total_cad,
  COUNT(*) as nb_transactions
FROM transactions
WHERE type = 'loyer';

COMMENT ON VIEW cash_flow_summary IS
  'Résumé des flux de trésorerie par catégorie';

-- ==========================================
-- 2. FONCTION: CALCULER NAV RÉALISTE CORRIGÉ
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
    v_exchange_rate := 1.40; -- Valeur par défaut
  END IF;

  -- 1. FLUX DE TRÉSORERIE (tous en CAD)

  -- Total investi par les investisseurs
  SELECT COALESCE(SUM(amount), 0)
  INTO total_investments
  FROM transactions
  WHERE type = 'investissement';

  -- Argent dépensé pour acheter des propriétés
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO property_purchases
  FROM transactions
  WHERE type = 'investissement' AND property_id IS NOT NULL;

  -- CAPEX (amélioration propriétés)
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

  -- 2. SOLDE DE TRÉSORERIE (compte courant)
  -- = Argent investi - Achats propriétés - Dépenses + Revenus
  cash_balance := total_investments
                  - property_purchases
                  - capex_expenses
                  - maintenance_expenses
                  - admin_expenses
                  + rental_income;

  -- 3. VALEUR DES PROPRIÉTÉS

  -- Valeur initiale (prix d'achat en CAD)
  SELECT COALESCE(SUM(valuation_amount * v_exchange_rate), 0)
  INTO properties_initial_value
  FROM property_valuations
  WHERE valuation_type = 'initial';

  -- Valeur actuelle avec appréciation 8% annuelle
  SELECT COALESCE(SUM(current_value * v_exchange_rate), 0)
  INTO properties_current_value
  FROM current_property_values;

  -- Gain d'appréciation
  properties_appreciation := properties_current_value - properties_initial_value;

  -- 4. ACTIFS TOTAUX
  -- = Trésorerie + Valeur actuelle des propriétés
  total_assets := cash_balance + properties_current_value;

  -- 5. PASSIFS (prêts, hypothèques)
  -- Pour l'instant = 0, mais pourrait être ajouté plus tard
  total_liabilities := 0;

  -- 6. NAV (Valeur nette des actifs)
  net_asset_value := total_assets - total_liabilities;

  -- 7. PARTS TOTALES
  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO total_shares
  FROM investor_investments;

  -- 8. NAV PAR PART
  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.00; -- Valeur par défaut
  END IF;

  -- 9. PERFORMANCE (variation depuis le départ)
  -- Au départ: NAV = 1.00 $
  -- Maintenant: NAV = nav_per_share
  nav_change_pct := ((nav_per_share - 1.00) / 1.00) * 100;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_realistic_nav_v2 IS
  'Calcule le NAV réaliste basé sur les flux de trésorerie réels et l''appréciation progressive';

-- ==========================================
-- 3. VUE: NAV ACTUEL V2
-- ==========================================

CREATE OR REPLACE VIEW realistic_nav_current_v2 AS
SELECT * FROM calculate_realistic_nav_v2(CURRENT_DATE);

COMMENT ON VIEW realistic_nav_current_v2 IS
  'Vue du NAV actuel calculé de manière réaliste (version corrigée)';

-- ==========================================
-- 4. TEST ET AFFICHAGE
-- ==========================================

DO $$
DECLARE
  v_nav RECORD;
  v_cash_flow RECORD;
  v_appreciation_pct DECIMAL(10, 2);
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📊 TEST DU CALCUL NAV RÉALISTE V2';
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
  '✅ MIGRATION 84 TERMINÉE' as status,
  'Calcul NAV corrigé basé sur les flux de trésorerie réels' as message;
