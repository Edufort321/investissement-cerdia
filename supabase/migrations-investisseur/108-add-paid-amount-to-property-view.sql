-- ==========================================
-- MIGRATION 108: Ajouter paid_amount + appreciation_rate_pct à current_property_values
-- Permet d'afficher : prix contractuel, montant versé, valeur marchande estimée
-- ==========================================

DROP VIEW IF EXISTS current_property_values;

CREATE OR REPLACE VIEW current_property_values AS
SELECT
  p.id                                                                              AS property_id,
  p.name                                                                            AS property_name,

  -- Prix total du contrat (valeur d'achat contractuelle)
  p.total_cost                                                                      AS acquisition_cost,

  -- Montant effectivement versé à ce jour
  p.paid_amount                                                                     AS paid_amount,

  COALESCE(p.reservation_date::DATE, p.completion_date::DATE)                      AS acquisition_date,

  -- Évaluation initiale enregistrée (property_valuations)
  pv.acquisition_cost                                                               AS initial_acquisition_cost,
  pv.current_market_value                                                           AS initial_market_value,
  pv.valuation_date                                                                 AS initial_valuation_date,

  -- Valeur appréciée calculée sur la base utilisée par la fonction (montant versé ou évaluation)
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE)                  AS current_value,

  -- Années détenues
  GREATEST(
    (CURRENT_DATE - COALESCE(
      p.reservation_date::DATE,
      p.completion_date::DATE,
      pv.valuation_date,
      CURRENT_DATE
    ))::NUMERIC / 365.25,
    0
  )                                                                                 AS years_held,

  -- Gain d'appréciation (sur la base utilisée)
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE)
    - COALESCE(pv.acquisition_cost, p.total_cost, 0)                              AS appreciation_amount,

  -- Pourcentage d'appréciation (sur la base utilisée)
  CASE
    WHEN COALESCE(pv.acquisition_cost, p.total_cost, 0) > 0 THEN
      ROUND((
        (calculate_property_value_with_appreciation(p.id, CURRENT_DATE)
          - COALESCE(pv.acquisition_cost, p.total_cost))
        / COALESCE(pv.acquisition_cost, p.total_cost)
      ) * 100, 2)
    ELSE 0
  END                                                                               AS appreciation_percentage,

  p.status,
  p.currency,

  -- Taux annuel utilisé (pour calcul valeur marchande estimée côté frontend)
  ROUND(get_property_appreciation_rate(p.id) * 100, 2)                            AS appreciation_rate_pct

FROM properties p
LEFT JOIN property_valuations pv
  ON p.id = pv.property_id AND pv.valuation_type = 'initial'
WHERE p.status IN (
  'reservation',
  'en_construction',
  'acquired',
  'complete',
  'actif',
  'en_location'
)
ORDER BY COALESCE(p.reservation_date::DATE, p.completion_date::DATE) DESC NULLS LAST;

COMMENT ON VIEW current_property_values IS
  'Valeurs actuelles: prix contractuel, montant versé, valeur appréciée, taux annuel — toutes phases actives';

DO $$
BEGIN
  RAISE NOTICE '✅ Vue current_property_values mise à jour avec paid_amount et appreciation_rate_pct';
END $$;
