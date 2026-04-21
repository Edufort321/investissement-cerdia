-- ==========================================
-- MIGRATION 106: AJOUTER CHAMPS VENTE PROPRIÉTÉ
-- ==========================================
--
-- OBJECTIF:
-- Permettre d'enregistrer la vente d'une propriété avec:
-- - Date de vente
-- - Prix de vente
-- - Devise
-- - Nom de l'acheteur
-- - Notes sur la transaction
--
-- Cela permet de calculer:
-- - Gain/Perte total sur l'investissement
-- - ROI final sur toute la période
-- - Performance complète (Achat → Location → Vente)
--
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 106: AJOUTER CHAMPS VENTE PROPRIÉTÉ';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- AJOUTER COLONNES VENTE
-- ==========================================

-- Date de vente
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS sale_date DATE;

COMMENT ON COLUMN properties.sale_date IS
  'Date de vente de la propriété (si vendue)';

-- Prix de vente
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(15, 2);

COMMENT ON COLUMN properties.sale_price IS
  'Prix de vente de la propriété';

-- Devise de vente (peut être différente de currency)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS sale_currency TEXT DEFAULT 'USD';

COMMENT ON COLUMN properties.sale_currency IS
  'Devise du prix de vente (USD, CAD, etc.)';

-- Nom de l'acheteur (optionnel)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS buyer_name TEXT;

COMMENT ON COLUMN properties.buyer_name IS
  'Nom de l''acheteur (optionnel, pour historique)';

-- Notes sur la vente (optionnel)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS sale_notes TEXT;

COMMENT ON COLUMN properties.sale_notes IS
  'Notes additionnelles sur la transaction de vente';

-- ==========================================
-- AJOUTER STATUT 'vendu'
-- ==========================================

-- Vérifier si le statut 'vendu' existe déjà dans la contrainte
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;

  -- Recréer la contrainte avec le nouveau statut 'vendu'
  ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN (
    'pending',
    'reservation',
    'en_construction',
    'complete',
    'actif',
    'acquired',
    'en_location',
    'vendu'  -- NOUVEAU STATUT
  ));

  RAISE NOTICE '✅ Statut ''vendu'' ajouté aux statuts possibles';
END $$;

-- ==========================================
-- CRÉER INDEX POUR RECHERCHE PAR DATE VENTE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_properties_sale_date
ON properties(sale_date)
WHERE sale_date IS NOT NULL;

COMMENT ON INDEX idx_properties_sale_date IS
  'Index pour rechercher rapidement les propriétés vendues par date';

-- ==========================================
-- FONCTION: CALCULER GAIN/PERTE SUR VENTE
-- ==========================================

CREATE OR REPLACE FUNCTION calculate_property_sale_profit(
  p_property_id UUID,
  p_sale_price DECIMAL,
  p_sale_currency TEXT DEFAULT 'USD'
)
RETURNS TABLE (
  total_cost DECIMAL,
  total_revenues DECIMAL,
  total_expenses DECIMAL,
  sale_price DECIMAL,
  net_profit DECIMAL,
  roi_percent DECIMAL
) AS $$
DECLARE
  v_property RECORD;
  v_total_revenues DECIMAL := 0;
  v_total_expenses DECIMAL := 0;
  v_net_profit DECIMAL := 0;
  v_roi DECIMAL := 0;
BEGIN
  -- Récupérer les infos de la propriété
  SELECT * INTO v_property FROM properties WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Propriété non trouvée: %', p_property_id;
  END IF;

  -- Calculer REVENUS (loyer + dividendes)
  SELECT COALESCE(SUM(
    CASE
      WHEN source_currency = p_sale_currency AND source_amount IS NOT NULL
        THEN source_amount
      ELSE amount -- Fallback sur CAD si pas de source_amount
    END
  ), 0) INTO v_total_revenues
  FROM transactions
  WHERE property_id = p_property_id
    AND type IN ('loyer', 'dividende');

  -- Calculer DÉPENSES (maintenance, capex, admin, depense)
  SELECT COALESCE(SUM(
    CASE
      WHEN source_currency = p_sale_currency AND source_amount IS NOT NULL
        THEN source_amount
      ELSE amount
    END
  ), 0) INTO v_total_expenses
  FROM transactions
  WHERE property_id = p_property_id
    AND type IN ('maintenance', 'capex', 'admin', 'depense', 'achat_propriete');

  -- Calculer PROFIT NET
  -- Profit = (Prix vente + Revenus) - (Coût achat + Dépenses)
  v_net_profit := (p_sale_price + v_total_revenues) - (v_property.total_cost + v_total_expenses);

  -- Calculer ROI (%)
  IF v_property.total_cost > 0 THEN
    v_roi := (v_net_profit / v_property.total_cost) * 100;
  ELSE
    v_roi := 0;
  END IF;

  -- Retourner les résultats
  RETURN QUERY SELECT
    v_property.total_cost,
    v_total_revenues,
    v_total_expenses,
    p_sale_price,
    v_net_profit,
    v_roi;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_property_sale_profit IS
  'Calcule le gain/perte net et le ROI total lors de la vente d''une propriété';

-- ==========================================
-- VÉRIFICATION
-- ==========================================

DO $$
DECLARE
  v_columns_added INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Vérifier les colonnes ajoutées
  SELECT COUNT(*) INTO v_columns_added
  FROM information_schema.columns
  WHERE table_name = 'properties'
    AND column_name IN ('sale_date', 'sale_price', 'sale_currency', 'buyer_name', 'sale_notes');

  RAISE NOTICE '📊 Colonnes vente ajoutées: %', v_columns_added;

  IF v_columns_added = 5 THEN
    RAISE NOTICE '✅ Toutes les colonnes vente sont présentes';
  ELSE
    RAISE WARNING '⚠️ Certaines colonnes sont manquantes';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 106 TERMINÉE';
  RAISE NOTICE '';
  RAISE NOTICE 'Nouvelles fonctionnalités disponibles:';
  RAISE NOTICE '  • Enregistrer vente d''une propriété';
  RAISE NOTICE '  • Calculer gain/perte total';
  RAISE NOTICE '  • Calculer ROI sur toute la période';
  RAISE NOTICE '  • Statut ''vendu'' disponible';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
