-- ==========================================
-- MIGRATION 105: INCLURE PROPRIÉTÉS EN RÉSERVATION DANS NAV
-- ==========================================
--
-- PROBLÈME:
-- Les propriétés avec statut 'reservation' ne s'affichent pas dans le NAV
-- car la vue current_property_values filtre sur ('acquired', 'complete', 'en_location')
--
-- SOLUTION:
-- Modifier la vue pour inclure le statut 'reservation'
-- Cela permet d'afficher les propriétés en cours d'achat dans le NAV
--
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 105: INCLURE STATUT RESERVATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- RECRÉER LA VUE current_property_values
-- ==========================================

DROP VIEW IF EXISTS current_property_values;

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
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - COALESCE(pv.acquisition_cost, p.total_cost) as appreciation_amount,

  -- Taux d'appréciation réalisé
  CASE
    WHEN COALESCE(pv.acquisition_cost, p.total_cost) > 0 THEN
      ((calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - COALESCE(pv.acquisition_cost, p.total_cost)) / COALESCE(pv.acquisition_cost, p.total_cost)) * 100
    ELSE 0
  END as appreciation_percentage,

  p.status,
  p.currency

FROM properties p
LEFT JOIN property_valuations pv ON p.id = pv.property_id AND pv.valuation_type = 'initial'
WHERE p.status IN (
  'reservation',   -- NOUVEAU: Propriétés réservées (en cours d'achat)
  'acquired',      -- Acquises
  'complete',      -- Complétées
  'en_location'    -- En location
)
ORDER BY COALESCE(p.reservation_date, p.completion_date) DESC;

COMMENT ON VIEW current_property_values IS
  'Vue des valeurs actuelles des propriétés avec appréciation 8% annuelle - INCLUT réservations';

-- ==========================================
-- VÉRIFICATION
-- ==========================================

DO $$
DECLARE
  v_total_properties INTEGER;
  v_reservation_properties INTEGER;
BEGIN
  -- Compter les propriétés visibles dans la vue
  SELECT COUNT(*) INTO v_total_properties FROM current_property_values;

  -- Compter les propriétés en réservation
  SELECT COUNT(*) INTO v_reservation_properties
  FROM current_property_values
  WHERE status = 'reservation';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Propriétés visibles dans la vue: %', v_total_properties;
  RAISE NOTICE '📊 Propriétés en réservation: %', v_reservation_properties;
  RAISE NOTICE '';

  IF v_reservation_properties > 0 THEN
    RAISE NOTICE '✅ Les propriétés en réservation sont maintenant visibles!';
    RAISE NOTICE '';
    RAISE NOTICE 'Liste des propriétés en réservation:';

    -- Afficher les propriétés en réservation
    FOR v_property IN
      SELECT property_name, acquisition_cost, currency
      FROM current_property_values
      WHERE status = 'reservation'
    LOOP
      RAISE NOTICE '  • % - % %', v_property.property_name, v_property.acquisition_cost, v_property.currency;
    END LOOP;
  ELSE
    RAISE NOTICE '⚠️  Aucune propriété en réservation trouvée';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES:';
  RAISE NOTICE '   1. Rafraîchir la page Administration/NAV (F5)';
  RAISE NOTICE '   2. Vérifier que les 3 propriétés s''affichent';
  RAISE NOTICE '   3. Vérifier les valeurs d''achat et actuelles';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- NOTE IMPORTANTE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '💡 NOTE IMPORTANTE:';
  RAISE NOTICE '';
  RAISE NOTICE 'Les propriétés en réservation sont maintenant incluses dans le NAV.';
  RAISE NOTICE 'Cela permet de voir la valeur des propriétés en cours d''achat.';
  RAISE NOTICE '';
  RAISE NOTICE 'Si une propriété en réservation n''a pas d''évaluation initiale,';
  RAISE NOTICE 'le calcul utilisera le total_cost comme base pour l''appréciation.';
  RAISE NOTICE '';
  RAISE NOTICE 'Workflow complet:';
  RAISE NOTICE '  1. Réservation → Visible dans NAV avec scénario 8%';
  RAISE NOTICE '  2. Acquisition → Continuer avec scénario 8%';
  RAISE NOTICE '  3. Livraison → Évaluation réelle remplace scénario';
  RAISE NOTICE '  4. Aux 2 ans → Réévaluation';
  RAISE NOTICE '';
END $$;
