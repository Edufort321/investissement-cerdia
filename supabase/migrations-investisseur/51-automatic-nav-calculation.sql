-- =====================================================
-- SCRIPT 51: CALCUL AUTOMATIQUE DU NAV
--
-- Ce script modifie le système pour calculer automatiquement le NAV
-- basé sur les VRAIES TRANSACTIONS :
--
-- 1. Parts émises = Somme des transactions 'investissement' des commanditaires
-- 2. Actifs = Évaluations propriétés + Liquidités (compte courant)
-- 3. NAV = Total Actifs / Total Parts
--
-- AUCUNE valeur fixe - tout est calculé dynamiquement !
--
-- Date: 2025-10-24
-- Auteur: System Migration
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER LA VUE EXISTANTE (pour modification)
-- =====================================================

DROP VIEW IF EXISTS current_share_price CASCADE;

-- =====================================================
-- 2. AJOUTER CHAMP IS_PROJECTED
-- =====================================================

ALTER TABLE share_price_history
ADD COLUMN IF NOT EXISTS is_projected BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN share_price_history.is_projected IS 'TRUE = projection, FALSE = calcul réel basé sur transactions';

-- =====================================================
-- 3. SUPPRIMER L'ANCIENNE FONCTION calculate_share_price()
-- =====================================================

DROP FUNCTION IF EXISTS calculate_share_price(DATE, VARCHAR, TEXT);

-- =====================================================
-- 4. CRÉER NOUVELLE FONCTION calculate_share_price()
-- Calcul automatique depuis les transactions réelles
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_share_price(
  p_effective_date DATE DEFAULT CURRENT_DATE,
  p_revision_type VARCHAR(50) DEFAULT 'special',
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  share_price DECIMAL(10, 4),
  total_assets DECIMAL(15, 2),
  total_liabilities DECIMAL(15, 2),
  net_asset_value DECIMAL(15, 2),
  total_shares DECIMAL(15, 2),
  total_invested DECIMAL(15, 2),
  property_values DECIMAL(15, 2),
  liquid_assets DECIMAL(15, 2),
  message TEXT
) AS $$
DECLARE
  v_property_values DECIMAL(15, 2);
  v_liquid_assets DECIMAL(15, 2);
  v_total_assets DECIMAL(15, 2);
  v_total_liabilities DECIMAL(15, 2);
  v_total_shares DECIMAL(15, 2);
  v_total_invested DECIMAL(15, 2);
  v_previous_price DECIMAL(10, 4);
  v_calculation_details JSONB;
BEGIN
  -- =====================================================
  -- ÉTAPE 1: CALCULER LES PARTS ÉMISES
  -- Somme des transactions 'investissement' des commanditaires
  -- =====================================================

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_total_invested
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.date <= p_effective_date;

  -- Nombre de parts = montant investi (1 part = 1 $ au début)
  -- Les parts sont émises au prix du jour de l'investissement
  v_total_shares := v_total_invested;

  -- Si aucun investissement, initialiser à 1 pour éviter division par zéro
  IF v_total_shares = 0 THEN
    v_total_shares := 1;
  END IF;

  -- =====================================================
  -- ÉTAPE 2: CALCULER LES ACTIFS IMMOBILIERS
  -- Dernières évaluations de chaque propriété
  -- =====================================================

  SELECT COALESCE(SUM(pv.current_market_value), 0)
  INTO v_property_values
  FROM (
    SELECT DISTINCT ON (property_id)
      property_id,
      current_market_value
    FROM property_valuations
    WHERE valuation_date <= p_effective_date
    ORDER BY property_id, valuation_date DESC
  ) pv;

  -- =====================================================
  -- ÉTAPE 3: CALCULER LES LIQUIDITÉS
  -- Argent restant = Investissements - Dépenses immobilières
  -- =====================================================

  -- Liquidités = Total investi - Dépenses immobilières - Dépenses opérationnelles
  SELECT
    v_total_invested - COALESCE(SUM(
      CASE
        WHEN t.type IN ('depense', 'capex', 'courant') THEN t.amount
        ELSE 0
      END
    ), 0)
  INTO v_liquid_assets
  FROM transactions t
  WHERE t.date <= p_effective_date;

  -- Si liquidités négatives, c'est qu'il y a des dettes
  IF v_liquid_assets < 0 THEN
    v_total_liabilities := ABS(v_liquid_assets);
    v_liquid_assets := 0;
  ELSE
    v_total_liabilities := 0;
  END IF;

  -- =====================================================
  -- ÉTAPE 4: CALCULER TOTAL DES ACTIFS
  -- Actifs = Propriétés + Liquidités
  -- =====================================================

  v_total_assets := v_property_values + v_liquid_assets;

  -- =====================================================
  -- ÉTAPE 5: RÉCUPÉRER PRIX PRÉCÉDENT
  -- =====================================================

  SELECT sph.share_price INTO v_previous_price
  FROM share_price_history sph
  WHERE sph.published = TRUE
    AND sph.effective_date < p_effective_date
  ORDER BY sph.effective_date DESC
  LIMIT 1;

  -- Si pas de prix précédent, c'est le prix initial (1$)
  IF v_previous_price IS NULL THEN
    v_previous_price := 1.0000;
  END IF;

  -- =====================================================
  -- ÉTAPE 6: CRÉER DÉTAILS DU CALCUL
  -- =====================================================

  v_calculation_details := jsonb_build_object(
    'total_invested', v_total_invested,
    'property_values', v_property_values,
    'liquid_assets', v_liquid_assets,
    'total_assets', v_total_assets,
    'total_liabilities', v_total_liabilities,
    'net_asset_value', v_total_assets - v_total_liabilities,
    'total_shares', v_total_shares,
    'previous_price', v_previous_price,
    'calculation_date', NOW(),
    'calculation_method', 'automatic_from_transactions'
  );

  -- =====================================================
  -- ÉTAPE 7: INSÉRER DANS L'HISTORIQUE
  -- =====================================================

  INSERT INTO share_price_history (
    effective_date,
    revision_type,
    total_assets,
    total_liabilities,
    total_shares,
    previous_price,
    notes,
    calculation_details,
    is_projected,
    published
  ) VALUES (
    p_effective_date,
    p_revision_type,
    v_total_assets,
    v_total_liabilities,
    v_total_shares,
    v_previous_price,
    COALESCE(p_notes, 'Calcul automatique basé sur transactions réelles'),
    v_calculation_details,
    FALSE, -- Pas une projection
    FALSE  -- Pas encore publié, doit être approuvé
  )
  ON CONFLICT (effective_date) DO UPDATE SET
    total_assets = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities,
    total_shares = EXCLUDED.total_shares,
    notes = EXCLUDED.notes,
    calculation_details = EXCLUDED.calculation_details;

  -- =====================================================
  -- ÉTAPE 8: RETOURNER LES RÉSULTATS
  -- =====================================================

  RETURN QUERY
  SELECT
    CASE
      WHEN v_total_shares > 0 THEN
        ROUND(((v_total_assets - v_total_liabilities) / v_total_shares)::numeric, 4)
      ELSE 1.0000
    END as share_price,
    v_total_assets,
    v_total_liabilities,
    v_total_assets - v_total_liabilities as net_asset_value,
    v_total_shares,
    v_total_invested,
    v_property_values,
    v_liquid_assets,
    FORMAT(
      'NAV calculé automatiquement. Investi: %s$ | Propriétés: %s$ | Liquidités: %s$ | Parts: %s',
      v_total_invested, v_property_values, v_liquid_assets, v_total_shares
    ) as message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_share_price IS 'Calcule automatiquement le NAV depuis les transactions réelles et évaluations';

-- =====================================================
-- 5. RECRÉER LA VUE CURRENT_SHARE_PRICE
-- =====================================================

CREATE OR REPLACE VIEW current_share_price AS
WITH current_price AS (
  SELECT *
  FROM share_price_history
  WHERE published = TRUE
  ORDER BY effective_date DESC
  LIMIT 1
),
previous_price_calc AS (
  SELECT share_price as prev_price
  FROM share_price_history
  WHERE published = TRUE
    AND effective_date < (SELECT effective_date FROM current_price)
  ORDER BY effective_date DESC
  LIMIT 1
),
initial_price AS (
  SELECT share_price as initial_price
  FROM share_price_history
  WHERE published = TRUE
    AND revision_type = 'initial'
  ORDER BY effective_date
  LIMIT 1
)
SELECT
  cp.effective_date,
  cp.share_price,

  -- Calculate price_change in the view
  CASE
    WHEN COALESCE(pp.prev_price, 0) > 0 THEN cp.share_price - pp.prev_price
    ELSE 0
  END as price_change,

  -- Calculate price_change_percentage in the view
  CASE
    WHEN COALESCE(pp.prev_price, 0) > 0 THEN
      ROUND(((cp.share_price - pp.prev_price) / pp.prev_price * 100)::numeric, 2)
    ELSE 0
  END as price_change_percentage,

  cp.total_assets,
  cp.total_liabilities,
  cp.net_asset_value,
  cp.total_shares,

  -- Calculate total_return_percentage (depuis le début)
  CASE
    WHEN COALESCE(ip.initial_price, 0) > 0 THEN
      ROUND(((cp.share_price - ip.initial_price) / ip.initial_price * 100)::numeric, 2)
    ELSE 0
  END as total_return_percentage,

  -- Calculate days_since_revision
  CURRENT_DATE - cp.effective_date as days_since_revision,

  -- Calculate next_revision_date (1er juin de l'année suivante)
  CASE
    WHEN CURRENT_DATE >= DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '5 months' -- Après le 1er juin
    THEN DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year 5 months' -- 1er juin année prochaine
    ELSE DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '5 months' -- 1er juin cette année
  END::DATE as next_revision_date,

  -- Indiquer si c'est une projection
  cp.is_projected
FROM current_price cp
LEFT JOIN previous_price_calc pp ON TRUE
LEFT JOIN initial_price ip ON TRUE;

COMMENT ON VIEW current_share_price IS 'Prix actuel des parts calculé automatiquement depuis transactions';

-- =====================================================
-- 6. CRÉER PRIX INITIAL (si aucune transaction encore)
-- =====================================================

-- Insérer un prix initial de 1,00 $ seulement si aucun prix n'existe
INSERT INTO share_price_history (
  effective_date,
  revision_type,
  total_assets,
  total_liabilities,
  total_shares,
  previous_price,
  notes,
  is_projected,
  published,
  calculated_at
)
SELECT
  '2025-03-20'::DATE,
  'initial',
  1.00,
  0,
  1.00,
  NULL,
  'Prix initial avant premières transactions. Sera recalculé automatiquement.',
  FALSE,
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM share_price_history WHERE published = TRUE
);

-- =====================================================
-- 7. AFFICHAGE CONFIRMATION
-- =====================================================

DO $$
DECLARE
  v_transaction_count INT;
  v_investment_total DECIMAL(15, 2);
  v_property_count INT;
BEGIN
  -- Compter les transactions d'investissement
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_transaction_count, v_investment_total
  FROM transactions
  WHERE type = 'investissement';

  -- Compter les propriétés évaluées
  SELECT COUNT(DISTINCT property_id)
  INTO v_property_count
  FROM property_valuations;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'SYSTÈME NAV AUTOMATIQUE CONFIGURÉ';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Le NAV sera calculé automatiquement à partir de :';
  RAISE NOTICE '  1. Transactions d''investissement des commanditaires';
  RAISE NOTICE '  2. Évaluations des propriétés';
  RAISE NOTICE '  3. Liquidités (investissements - dépenses)';
  RAISE NOTICE '';
  RAISE NOTICE 'État actuel :';
  RAISE NOTICE '  - Transactions investissement : %', v_transaction_count;
  RAISE NOTICE '  - Total investi : % $ CAD', v_investment_total;
  RAISE NOTICE '  - Propriétés évaluées : %', v_property_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '  1. Entrer les transactions d''investissement des commanditaires';
  RAISE NOTICE '  2. Entrer les évaluations des 3 condos';
  RAISE NOTICE '  3. Aller dans Administration > Prix des parts';
  RAISE NOTICE '  4. Cliquer "Calculer" - Le NAV sera calculé automatiquement !';
  RAISE NOTICE '  5. Vérifier le calcul et publier';
  RAISE NOTICE '';
  RAISE NOTICE 'Le graphique montrera l''évolution réelle basée sur vos données.';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 8. AFFICHER PRIX ACTUEL
-- =====================================================

SELECT
  effective_date,
  share_price,
  total_assets,
  total_shares,
  is_projected,
  notes
FROM share_price_history
WHERE published = TRUE
ORDER BY effective_date DESC
LIMIT 1;
