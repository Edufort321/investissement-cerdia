-- ==========================================
-- MIGRATION 81: NAV RÉALISTE AVEC APPRÉCIATION 8% ANNUELLE
-- Système de calcul NAV basé sur scénarios réalistes
-- ==========================================

-- OBJECTIF:
-- Calculer un NAV progressif et réaliste basé sur:
-- 1. Entrées d'argent (investissements)
-- 2. Sorties d'argent (achats de propriétés, dépenses)
-- 3. Appréciation des biens immobiliers (~8% annuel)
-- 4. Revenus locatifs (arriveront au compte courant)

-- ==========================================
-- 1. TRIGGER: CRÉER ÉVALUATION INITIALE À L'ACHAT
-- ==========================================

-- Quand une propriété passe en statut "acquired", créer automatiquement
-- une évaluation initiale = prix d'achat

CREATE OR REPLACE FUNCTION auto_create_initial_valuation()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement si le statut passe à "acquired" et qu'il n'y a pas déjà d'évaluation
  IF NEW.status = 'acquired' AND (OLD.status IS NULL OR OLD.status != 'acquired') THEN

    -- Vérifier si une évaluation initiale existe déjà
    IF NOT EXISTS (
      SELECT 1 FROM property_valuations
      WHERE property_id = NEW.id
        AND valuation_type = 'initial'
    ) THEN
      -- Créer l'évaluation initiale
      INSERT INTO property_valuations (
        property_id,
        valuation_date,
        valuation_amount,
        valuation_type,
        valuation_method,
        appraiser_name,
        notes,
        currency
      ) VALUES (
        NEW.id,
        COALESCE(NEW.acquisition_date, CURRENT_DATE),
        NEW.total_cost, -- Prix d'achat
        'initial',
        'purchase_price',
        'Système automatique',
        CONCAT('Évaluation initiale automatique au moment de l''achat - Propriété: ', NEW.name),
        'USD' -- Les propriétés sont en USD
      );

      RAISE NOTICE '✅ Évaluation initiale créée pour propriété %: % USD',
        NEW.name, NEW.total_cost;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_initial_valuation ON properties;

CREATE TRIGGER auto_create_initial_valuation
AFTER INSERT OR UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION auto_create_initial_valuation();

COMMENT ON FUNCTION auto_create_initial_valuation IS
  'Crée automatiquement une évaluation initiale quand une propriété est marquée comme acquise';

-- ==========================================
-- 2. FONCTION: CALCULER VALEUR AVEC APPRÉCIATION
-- ==========================================

-- Calcule la valeur actuelle d'une propriété avec appréciation de 8% annuelle

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
  -- Récupérer l'évaluation initiale
  SELECT *
  INTO v_initial_valuation
  FROM property_valuations
  WHERE property_id = p_property_id
    AND valuation_type = 'initial'
  ORDER BY valuation_date ASC
  LIMIT 1;

  -- Si pas d'évaluation, retourner 0
  IF v_initial_valuation IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculer le nombre d'années écoulées (avec décimales pour les mois)
  v_years_elapsed := EXTRACT(EPOCH FROM (p_target_date - v_initial_valuation.valuation_date)) / (365.25 * 24 * 3600);

  -- Si négatif (date cible avant évaluation), utiliser la valeur initiale
  IF v_years_elapsed < 0 THEN
    RETURN v_initial_valuation.valuation_amount;
  END IF;

  -- Formule de l'appréciation composée: V = V0 × (1 + r)^t
  v_current_value := v_initial_valuation.valuation_amount * POWER(1 + v_appreciation_rate, v_years_elapsed);

  RETURN v_current_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_property_value_with_appreciation IS
  'Calcule la valeur actuelle d''une propriété avec appréciation composée de 8% annuelle';

-- ==========================================
-- 3. VUE: VALEUR ACTUELLE DES PROPRIÉTÉS
-- ==========================================

CREATE OR REPLACE VIEW current_property_values AS
SELECT
  p.id as property_id,
  p.name as property_name,
  p.total_cost as acquisition_cost,
  p.acquisition_date,

  -- Évaluation initiale
  pv.valuation_amount as initial_valuation,
  pv.valuation_date as initial_valuation_date,

  -- Valeur actuelle avec appréciation 8%
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE) as current_value,

  -- Calculs
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(p.acquisition_date, pv.valuation_date))) as years_held,
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - pv.valuation_amount as appreciation_amount,

  -- Taux d'appréciation réalisé (peut différer de 8% si période < 1 an)
  CASE
    WHEN pv.valuation_amount > 0 THEN
      ((calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - pv.valuation_amount) / pv.valuation_amount) * 100
    ELSE 0
  END as appreciation_percentage,

  p.status,
  p.currency

FROM properties p
LEFT JOIN property_valuations pv ON p.id = pv.property_id AND pv.valuation_type = 'initial'
WHERE p.status = 'acquired' -- Seulement les propriétés acquises
ORDER BY p.acquisition_date DESC;

COMMENT ON VIEW current_property_values IS
  'Vue des valeurs actuelles des propriétés avec appréciation de 8% annuelle depuis l''acquisition';

-- ==========================================
-- 4. FONCTION: CALCULER NAV RÉALISTE
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_realistic_nav(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_assets DECIMAL(15, 2),
  total_liabilities DECIMAL(15, 2),
  net_asset_value DECIMAL(15, 2),
  total_shares DECIMAL(15, 4),
  nav_per_share DECIMAL(10, 4),
  cash_balance DECIMAL(15, 2),
  properties_value DECIMAL(15, 2),
  appreciation_gain DECIMAL(15, 2)
) AS $$
DECLARE
  v_exchange_rate DECIMAL(10, 4);
  v_total_investments DECIMAL(15, 2);
  v_total_expenses DECIMAL(15, 2);
  v_properties_initial DECIMAL(15, 2);
  v_properties_current DECIMAL(15, 2);
BEGIN
  -- Récupérer le taux de change actuel
  SELECT get_current_exchange_rate('USD', 'CAD') INTO v_exchange_rate;
  IF v_exchange_rate IS NULL THEN
    v_exchange_rate := 1.40; -- Valeur par défaut
  END IF;

  -- 1. ENTRÉES: Total des investissements (en CAD)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_investments
  FROM transactions
  WHERE type = 'investissement';

  -- 2. SORTIES: Total des dépenses (achats propriétés + dépenses opération)
  -- Inclut: achats de propriétés, CAPEX, maintenance, admin
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_total_expenses
  FROM transactions
  WHERE type IN ('capex', 'maintenance', 'admin')
     OR (type = 'investissement' AND property_id IS NOT NULL); -- Paiements de propriétés

  -- 3. VALEUR DES PROPRIÉTÉS
  -- Valeur initiale (prix d'achat converti en CAD)
  SELECT COALESCE(SUM(valuation_amount * v_exchange_rate), 0)
  INTO v_properties_initial
  FROM property_valuations
  WHERE valuation_type = 'initial';

  -- Valeur actuelle avec appréciation 8%
  SELECT COALESCE(SUM(current_value * v_exchange_rate), 0)
  INTO v_properties_current
  FROM current_property_values;

  -- 4. LIQUIDITÉS (COMPTE COURANT)
  -- = Investissements - Dépenses - Achats propriétés
  cash_balance := v_total_investments - v_total_expenses;

  -- 5. ACTIFS TOTAUX
  -- = Liquidités + Valeur actuelle des propriétés
  total_assets := cash_balance + v_properties_current;

  -- 6. PASSIFS (pour l'instant à 0, mais on pourrait ajouter les prêts)
  total_liabilities := 0;

  -- 7. NAV (Net Asset Value)
  net_asset_value := total_assets - total_liabilities;

  -- 8. PARTS TOTALES
  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO total_shares
  FROM investor_investments;

  -- 9. NAV PAR PART
  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.00; -- Valeur par défaut
  END IF;

  -- 10. GAIN D'APPRÉCIATION
  appreciation_gain := v_properties_current - v_properties_initial;

  -- Valeurs pour le retour
  properties_value := v_properties_current;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_realistic_nav IS
  'Calcule le NAV réaliste basé sur les flux de trésorerie et l''appréciation de 8% des propriétés';

-- ==========================================
-- 5. VUE: NAV ACTUEL RÉALISTE
-- ==========================================

CREATE OR REPLACE VIEW realistic_nav_current AS
SELECT
  (SELECT * FROM calculate_realistic_nav(CURRENT_DATE)).*;

COMMENT ON VIEW realistic_nav_current IS
  'Vue du NAV actuel calculé de manière réaliste avec appréciation 8% annuelle';

-- ==========================================
-- VÉRIFICATION
-- ==========================================

DO $$
DECLARE
  v_nav RECORD;
BEGIN
  -- Tester le calcul
  SELECT * INTO v_nav
  FROM calculate_realistic_nav(CURRENT_DATE);

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📊 TEST DU CALCUL NAV RÉALISTE';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Actifs totaux: % $ CAD', v_nav.total_assets;
  RAISE NOTICE '  - Liquidités: % $ CAD', v_nav.cash_balance;
  RAISE NOTICE '  - Propriétés: % $ CAD', v_nav.properties_value;
  RAISE NOTICE '  - Gain appréciation: % $ CAD', v_nav.appreciation_gain;
  RAISE NOTICE '';
  RAISE NOTICE 'Passifs: % $ CAD', v_nav.total_liabilities;
  RAISE NOTICE 'NAV: % $ CAD', v_nav.net_asset_value;
  RAISE NOTICE '';
  RAISE NOTICE 'Parts totales: %', v_nav.total_shares;
  RAISE NOTICE 'NAV par part: % $', v_nav.nav_per_share;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Trigger d''évaluation automatique créé';
  RAISE NOTICE '✅ Fonction de calcul avec appréciation 8% créée';
  RAISE NOTICE '✅ Vue current_property_values créée';
  RAISE NOTICE '✅ Fonction calculate_realistic_nav créée';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 81 TERMINÉE' as status,
  'Système de NAV réaliste avec appréciation 8% annuelle configuré' as message;
