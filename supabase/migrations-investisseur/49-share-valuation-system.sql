-- =====================================================
-- SCRIPT 49: SYSTÈME D'ÉVALUATION DES PARTS (NAV)
--
-- Ce script crée le système complet de valorisation des parts:
-- 1. Évaluations des propriétés (tous les 2 ans)
-- 2. Calcul automatique du prix des parts (NAV)
-- 3. Historique des prix avec révisions annuelles
-- 4. Affichage dans le dashboard
--
-- Concepts:
-- - Prix initial des parts: 1,00 $
-- - Révision annuelle: 1er juin de chaque année
-- - NAV = (Total Actifs - Total Passifs) / Nombre total de parts
-- - Réévaluation propriétés: Tous les 2 ans
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- =====================================================
-- TABLE 1: ÉVALUATIONS DES PROPRIÉTÉS
-- =====================================================

CREATE TABLE IF NOT EXISTS property_valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Évaluation
  valuation_date DATE NOT NULL,
  valuation_type VARCHAR(50) NOT NULL, -- 'initial', 'biennial', 'sale', 'special'

  -- Valeurs
  acquisition_cost DECIMAL(15, 2) NOT NULL, -- Coût d'acquisition original
  current_market_value DECIMAL(15, 2) NOT NULL, -- Valeur marchande actuelle
  estimated_value DECIMAL(15, 2), -- Estimation (si pas évaluation officielle)

  -- Source évaluation
  valuation_method VARCHAR(50), -- 'professional_appraisal', 'comparative_market', 'estimation'
  appraiser_name VARCHAR(255), -- Nom de l'évaluateur
  appraiser_license VARCHAR(100), -- Numéro de licence
  appraisal_document_url TEXT, -- Lien vers rapport d'évaluation

  -- Détails
  appreciation_amount DECIMAL(15, 2) GENERATED ALWAYS AS (current_market_value - acquisition_cost) STORED,
  appreciation_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN acquisition_cost > 0 THEN
        ROUND(((current_market_value - acquisition_cost) / acquisition_cost * 100)::numeric, 2)
      ELSE 0
    END
  ) STORED,

  notes TEXT,
  next_valuation_date DATE, -- Prochaine évaluation prévue (dans 2 ans)

  -- Audit
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_property_valuations_property ON property_valuations(property_id);
CREATE INDEX IF NOT EXISTS idx_property_valuations_date ON property_valuations(valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_property_valuations_next_date ON property_valuations(next_valuation_date);

COMMENT ON TABLE property_valuations IS 'Évaluations des propriétés pour calcul NAV';
COMMENT ON COLUMN property_valuations.valuation_type IS 'Type: initial, biennial (2 ans), sale (vente), special';
COMMENT ON COLUMN property_valuations.current_market_value IS 'Valeur marchande actuelle (évaluation professionnelle)';
COMMENT ON COLUMN property_valuations.estimated_value IS 'Estimation si pas évaluation officielle';
COMMENT ON COLUMN property_valuations.next_valuation_date IS 'Date de prochaine évaluation (dans 2 ans)';

-- =====================================================
-- TABLE 2: HISTORIQUE DES PRIX DES PARTS
-- =====================================================

CREATE TABLE IF NOT EXISTS share_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Date et type
  effective_date DATE NOT NULL UNIQUE, -- Date d'effet du nouveau prix
  revision_type VARCHAR(50) NOT NULL, -- 'initial', 'annual_june', 'special'

  -- Calcul NAV
  total_assets DECIMAL(15, 2) NOT NULL, -- Total des actifs (propriétés valorisées)
  total_liabilities DECIMAL(15, 2) DEFAULT 0, -- Total des passifs (dettes)
  net_asset_value DECIMAL(15, 2) GENERATED ALWAYS AS (total_assets - total_liabilities) STORED,

  total_shares DECIMAL(15, 2) NOT NULL, -- Nombre total de parts émises

  -- Prix par part
  share_price DECIMAL(10, 4) GENERATED ALWAYS AS (
    CASE
      WHEN total_shares > 0 THEN
        ROUND(((total_assets - total_liabilities) / total_shares)::numeric, 4)
      ELSE 1.0000
    END
  ) STORED,

  -- Variation (calculées dans la vue, pas en colonnes générées)
  previous_price DECIMAL(10, 4),

  -- Détails
  notes TEXT,
  calculation_details JSONB, -- Détails du calcul pour audit

  -- Audit
  calculated_by UUID,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  published BOOLEAN DEFAULT FALSE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_share_price_history_date ON share_price_history(effective_date DESC);

COMMENT ON TABLE share_price_history IS 'Historique des prix des parts (NAV)';
COMMENT ON COLUMN share_price_history.share_price IS 'Prix par part = NAV / Total parts';
COMMENT ON COLUMN share_price_history.effective_date IS 'Date d''effet (1er juin pour révision annuelle)';
COMMENT ON COLUMN share_price_history.revision_type IS 'Type: initial (1$), annual_june, special';

-- =====================================================
-- VUE: DERNIÈRE ÉVALUATION PAR PROPRIÉTÉ
-- =====================================================

CREATE OR REPLACE VIEW latest_property_valuations AS
SELECT DISTINCT ON (property_id)
  pv.*,
  p.name as property_name,
  p.location as property_location,
  p.status as property_status
FROM property_valuations pv
JOIN properties p ON p.id = pv.property_id
ORDER BY pv.property_id, pv.valuation_date DESC;

COMMENT ON VIEW latest_property_valuations IS 'Dernière évaluation de chaque propriété';

-- =====================================================
-- VUE: PRIX ACTUEL DES PARTS
-- =====================================================

CREATE OR REPLACE VIEW current_share_price AS
WITH current_price AS (
  SELECT *
  FROM share_price_history
  WHERE published = TRUE
  ORDER BY effective_date DESC
  LIMIT 1
)
SELECT
  cp.effective_date,
  cp.share_price,

  -- Calculer price_change et price_change_percentage dans la vue
  CASE
    WHEN cp.previous_price > 0 THEN cp.share_price - cp.previous_price
    ELSE 0
  END as price_change,

  CASE
    WHEN cp.previous_price > 0 THEN
      ROUND(((cp.share_price - cp.previous_price) / cp.previous_price * 100)::numeric, 2)
    ELSE 0
  END as price_change_percentage,

  cp.total_assets,
  cp.total_liabilities,
  cp.net_asset_value,
  cp.total_shares,
  cp.revision_type,
  cp.published,

  -- Retour sur investissement depuis le début (1$)
  ROUND(((cp.share_price - 1.0000) / 1.0000 * 100)::numeric, 2) as total_return_percentage,

  -- Jours depuis dernière révision
  CURRENT_DATE - cp.effective_date as days_since_revision,

  -- Prochaine révision prévue (1er juin prochain)
  CASE
    WHEN CURRENT_DATE < (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-06-01')::DATE
      THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-06-01')::DATE
    ELSE ((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text || '-06-01')::DATE
  END as next_revision_date

FROM current_price cp;

COMMENT ON VIEW current_share_price IS 'Prix actuel des parts pour affichage dashboard';

-- =====================================================
-- FONCTION: CALCULER NAV ET PRIX DES PARTS
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
  message TEXT
) AS $$
DECLARE
  v_total_assets DECIMAL(15, 2);
  v_total_liabilities DECIMAL(15, 2);
  v_total_shares DECIMAL(15, 2);
  v_previous_price DECIMAL(10, 4);
  v_calculation_details JSONB;
BEGIN
  -- 1. Calculer total des actifs (dernières évaluations)
  SELECT COALESCE(SUM(current_market_value), 0)
  INTO v_total_assets
  FROM latest_property_valuations;

  -- 2. Calculer total des passifs (pour l'instant, juste les dettes si table existe)
  -- TODO: Ajouter table liabilities si nécessaire
  v_total_liabilities := 0;

  -- 3. Récupérer total des parts émises
  SELECT COALESCE(SUM(total_shares), 0)
  INTO v_total_shares
  FROM investors;

  -- Si aucune part émise, initialiser à 1 part
  IF v_total_shares = 0 THEN
    v_total_shares := 1;
  END IF;

  -- 4. Récupérer le prix précédent
  SELECT sph.share_price INTO v_previous_price
  FROM share_price_history sph
  WHERE sph.published = TRUE
  ORDER BY sph.effective_date DESC
  LIMIT 1;

  -- Si pas de prix précédent, c'est le prix initial (1$)
  IF v_previous_price IS NULL THEN
    v_previous_price := 1.0000;
  END IF;

  -- 5. Créer détails du calcul pour audit
  v_calculation_details := jsonb_build_object(
    'total_assets', v_total_assets,
    'total_liabilities', v_total_liabilities,
    'net_asset_value', v_total_assets - v_total_liabilities,
    'total_shares', v_total_shares,
    'previous_price', v_previous_price,
    'calculation_date', NOW()
  );

  -- 6. Insérer dans l'historique (pas encore publié)
  INSERT INTO share_price_history (
    effective_date,
    revision_type,
    total_assets,
    total_liabilities,
    total_shares,
    previous_price,
    notes,
    calculation_details,
    published
  ) VALUES (
    p_effective_date,
    p_revision_type,
    v_total_assets,
    v_total_liabilities,
    v_total_shares,
    v_previous_price,
    p_notes,
    v_calculation_details,
    FALSE -- Pas encore publié, doit être approuvé
  );

  -- 7. Retourner les résultats
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
    'Prix calculé. Doit être approuvé avant publication.' as message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_share_price IS 'Calcule le prix des parts basé sur les dernières évaluations';

-- =====================================================
-- FONCTION: PUBLIER NOUVEAU PRIX DES PARTS
-- =====================================================

CREATE OR REPLACE FUNCTION publish_share_price(
  p_effective_date DATE,
  p_approved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Vérifier que le prix existe
  SELECT EXISTS(
    SELECT 1 FROM share_price_history
    WHERE effective_date = p_effective_date
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Aucun prix trouvé pour la date %', p_effective_date;
  END IF;

  -- Publier le prix
  UPDATE share_price_history
  SET
    published = TRUE,
    approved_by = p_approved_by,
    approved_at = NOW()
  WHERE effective_date = p_effective_date;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION publish_share_price IS 'Publie un prix calculé après approbation';

-- =====================================================
-- FONCTION: PROPRIÉTÉS NÉCESSITANT RÉÉVALUATION
-- =====================================================

CREATE OR REPLACE FUNCTION get_properties_needing_valuation()
RETURNS TABLE (
  property_id UUID,
  property_name VARCHAR(255),
  last_valuation_date DATE,
  days_since_valuation INTEGER,
  next_valuation_date DATE,
  days_until_valuation INTEGER,
  status VARCHAR(20) -- 'overdue', 'due_soon', 'ok'
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as property_id,
    p.name as property_name,
    lv.valuation_date as last_valuation_date,
    (CURRENT_DATE - lv.valuation_date)::INTEGER as days_since_valuation,
    lv.next_valuation_date,
    (lv.next_valuation_date - CURRENT_DATE)::INTEGER as days_until_valuation,
    CASE
      WHEN lv.next_valuation_date < CURRENT_DATE THEN 'overdue'
      WHEN lv.next_valuation_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
      ELSE 'ok'
    END::VARCHAR(20) as status
  FROM properties p
  LEFT JOIN latest_property_valuations lv ON lv.property_id = p.id
  WHERE p.status != 'sold' -- Exclure propriétés vendues
  ORDER BY lv.next_valuation_date ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_properties_needing_valuation IS 'Liste des propriétés nécessitant réévaluation';

-- =====================================================
-- RLS: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE property_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_price_history ENABLE ROW LEVEL SECURITY;

-- Tous peuvent voir les évaluations et prix publiés
CREATE POLICY "Authenticated can view valuations"
ON property_valuations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can view published prices"
ON share_price_history FOR SELECT
TO authenticated
USING (published = TRUE OR auth.uid() IN (SELECT user_id FROM investors WHERE access_level = 'admin'));

-- Seuls les admins peuvent créer/modifier
CREATE POLICY "Admin can manage valuations"
ON property_valuations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

CREATE POLICY "Admin can manage prices"
ON share_price_history FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Prix initial des parts: 1,00 $ (au lancement)
INSERT INTO share_price_history (
  effective_date,
  revision_type,
  total_assets,
  total_liabilities,
  total_shares,
  previous_price,
  notes,
  published
) VALUES (
  '2024-01-01', -- Date de lancement
  'initial',
  1.00, -- Actifs initiaux
  0, -- Pas de passifs
  1.00, -- 1 part initiale
  NULL, -- Pas de prix précédent
  'Prix initial au lancement de CERDIA',
  TRUE
)
ON CONFLICT (effective_date) DO NOTHING;

-- =====================================================
-- VÉRIFICATION ET CONFIRMATION
-- =====================================================

SELECT '✅ MIGRATION 49 TERMINEE - Système d''évaluation des parts (NAV)' AS status;

SELECT
  'Tables créées: property_valuations, share_price_history' as tables,
  'Vues créées: latest_property_valuations, current_share_price' as views,
  'Fonctions: calculate_share_price, publish_share_price, get_properties_needing_valuation' as functions;

-- Afficher le prix actuel
SELECT
  'Prix actuel des parts' as info,
  share_price as "Prix ($)",
  price_change as "Variation ($)",
  price_change_percentage as "Variation (%)",
  total_return_percentage as "Rendement total depuis 1$ (%)",
  next_revision_date as "Prochaine révision"
FROM current_share_price;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '💰 SYSTÈME D''ÉVALUATION DES PARTS (NAV)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Fonctionnalités:';
  RAISE NOTICE '  ✅ Évaluations propriétés (tous les 2 ans)';
  RAISE NOTICE '  ✅ Calcul automatique NAV';
  RAISE NOTICE '  ✅ Historique prix des parts';
  RAISE NOTICE '  ✅ Révisions annuelles (1er juin)';
  RAISE NOTICE '  ✅ Alertes réévaluations nécessaires';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Utilisation:';
  RAISE NOTICE '  1. Ajouter évaluation: INSERT INTO property_valuations...';
  RAISE NOTICE '  2. Calculer prix: SELECT * FROM calculate_share_price(''2025-06-01'', ''annual_june'')';
  RAISE NOTICE '  3. Publier prix: SELECT publish_share_price(''2025-06-01'', admin_uuid)';
  RAISE NOTICE '  4. Voir prix actuel: SELECT * FROM current_share_price';
  RAISE NOTICE '';
END $$;
