-- ==========================================
-- FIX: Trigger create_actual_cash_flow
-- Correction de la contrainte de clé étrangère scenario_id
-- ==========================================

-- Problème: Le trigger essaie d'insérer NEW.property_id dans scenario_id,
-- mais property_id ne référence pas la table scenarios, d'où l'erreur:
-- "violates foreign key constraint cash_flow_forecast_scenario_id_fkey"

-- Solution: Mettre scenario_id à NULL pour les transactions réelles

CREATE OR REPLACE FUNCTION create_actual_cash_flow_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_category TEXT;
  v_flow_type TEXT;
BEGIN
  -- Déterminer la catégorie selon le type de transaction
  v_category := CASE
    WHEN NEW.type IN ('investissement', 'dividende') THEN 'financing'
    WHEN NEW.type IN ('capex') THEN 'investing'
    ELSE 'operating'
  END;

  -- Déterminer le type de flux (inflow/outflow)
  v_flow_type := CASE
    WHEN NEW.amount > 0 THEN 'inflow'
    ELSE 'outflow'
  END;

  -- Insérer dans cash_flow_forecast comme valeur RÉELLE
  INSERT INTO cash_flow_forecast (
    forecast_date,
    category,
    subcategory,
    flow_type,
    amount,
    currency,
    scenario_id,  -- ✅ CORRECTION: Mis à NULL au lieu de NEW.property_id
    description,
    confidence_level,
    is_actual,
    actual_transaction_id
  ) VALUES (
    NEW.date,
    v_category,
    NEW.type,
    v_flow_type,
    ABS(NEW.amount),
    'CAD',
    NULL,  -- ✅ CORRECTION: NULL au lieu de NEW.property_id
    NEW.description,
    1, -- Confiance maximale (c'est du réel)
    true, -- C'est une valeur réelle, pas une prévision
    NEW.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_actual_cash_flow_from_transaction IS 'Crée automatiquement une entrée de cash flow réel depuis les transactions (scenario_id=NULL pour transactions réelles)';

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'create_actual_cash_flow'
  ) THEN
    RAISE NOTICE '✅ Trigger create_actual_cash_flow mis à jour avec succès';
    RAISE NOTICE 'ℹ️ Les nouvelles transactions n''essaieront plus d''utiliser property_id comme scenario_id';
  ELSE
    RAISE WARNING '⚠️ Le trigger create_actual_cash_flow n''existe pas encore';
  END IF;
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 76 TERMINÉE' as status,
  'Trigger create_actual_cash_flow corrigé (scenario_id = NULL)' as message;
