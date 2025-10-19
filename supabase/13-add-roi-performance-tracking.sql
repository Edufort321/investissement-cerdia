-- ==========================================
-- SYSTÈME DE SUIVI DE PERFORMANCE ROI
-- Calcul du ROI réel vs attendu avec alertes
-- ==========================================

-- Vue pour calculer la performance ROI de chaque projet
CREATE OR REPLACE VIEW property_performance AS
SELECT
  p.id as property_id,
  p.name as property_name,
  p.location,
  p.status,
  p.total_cost,
  p.paid_amount,
  p.currency,
  p.expected_roi,
  p.reservation_date,

  -- Calcul des revenus (dividendes) pour ce projet
  COALESCE(
    (SELECT SUM(t.amount)
     FROM transactions t
     WHERE t.property_id = p.id
       AND t.type = 'dividende'
    ), 0
  ) as total_revenue,

  -- Calcul des dépenses pour ce projet
  COALESCE(
    (SELECT SUM(t.amount)
     FROM transactions t
     WHERE t.property_id = p.id
       AND t.type IN ('paiement', 'depense')
    ), 0
  ) as total_expenses,

  -- Nombre de mois depuis la réservation
  EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) as months_since_reservation,

  -- ROI réel calculé (revenus / coût total * 100)
  CASE
    WHEN p.total_cost > 0 THEN
      ROUND(
        (COALESCE(
          (SELECT SUM(t.amount)
           FROM transactions t
           WHERE t.property_id = p.id
             AND t.type = 'dividende'
          ), 0
        ) / p.total_cost * 100)::numeric, 2
      )
    ELSE 0
  END as actual_roi,

  -- ROI réel annualisé (projeté sur 12 mois)
  CASE
    WHEN p.total_cost > 0 AND EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) > 0 THEN
      ROUND(
        (
          (COALESCE(
            (SELECT SUM(t.amount)
             FROM transactions t
             WHERE t.property_id = p.id
               AND t.type = 'dividende'
            ), 0
          ) / p.total_cost * 100)
          / (EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400))
          * 12
        )::numeric, 2
      )
    ELSE 0
  END as annualized_roi,

  -- Écart entre ROI réel annualisé et ROI attendu
  CASE
    WHEN p.total_cost > 0 AND EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) > 0 THEN
      ROUND(
        (
          (
            (COALESCE(
              (SELECT SUM(t.amount)
               FROM transactions t
               WHERE t.property_id = p.id
                 AND t.type = 'dividende'
              ), 0
            ) / p.total_cost * 100)
            / (EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400))
            * 12
          ) - p.expected_roi
        )::numeric, 2
      )
    ELSE -p.expected_roi
  END as roi_variance,

  -- Statut de performance
  CASE
    -- Excellent: ROI annualisé dépasse l'attendu de plus de 20%
    WHEN
      p.total_cost > 0
      AND EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) > 3
      AND (
        (
          (COALESCE(
            (SELECT SUM(t.amount)
             FROM transactions t
             WHERE t.property_id = p.id
               AND t.type = 'dividende'
            ), 0
          ) / p.total_cost * 100)
          / (EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400))
          * 12
        ) - p.expected_roi
      ) > (p.expected_roi * 0.2)
    THEN 'excellent'

    -- Bon: ROI annualisé proche ou légèrement au-dessus de l'attendu
    WHEN
      p.total_cost > 0
      AND EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) > 3
      AND (
        (
          (COALESCE(
            (SELECT SUM(t.amount)
             FROM transactions t
             WHERE t.property_id = p.id
               AND t.type = 'dividende'
            ), 0
          ) / p.total_cost * 100)
          / (EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400))
          * 12
        ) - p.expected_roi
      ) >= (p.expected_roi * -0.1)
    THEN 'good'

    -- Attention: ROI annualisé 10-30% en dessous de l'attendu
    WHEN
      p.total_cost > 0
      AND EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) > 3
      AND (
        (
          (COALESCE(
            (SELECT SUM(t.amount)
             FROM transactions t
             WHERE t.property_id = p.id
               AND t.type = 'dividende'
            ), 0
          ) / p.total_cost * 100)
          / (EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400))
          * 12
        ) - p.expected_roi
      ) >= (p.expected_roi * -0.3)
    THEN 'warning'

    -- Problème: ROI annualisé plus de 30% en dessous de l'attendu
    WHEN
      p.total_cost > 0
      AND EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) > 3
    THEN 'critical'

    -- Trop tôt pour évaluer (moins de 3 mois)
    ELSE 'pending'
  END as performance_status,

  -- Message de performance
  CASE
    WHEN EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) < 3 THEN
      'Trop tôt pour évaluer (< 3 mois)'
    WHEN p.total_cost = 0 THEN
      'Coût total non défini'
    WHEN (
      SELECT COUNT(*)
      FROM transactions t
      WHERE t.property_id = p.id
        AND t.type = 'dividende'
    ) = 0 THEN
      'Aucun revenu enregistré'
    ELSE
      NULL
  END as performance_message

FROM properties p
ORDER BY
  CASE
    WHEN EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400) > 3
    THEN (
      CASE
        WHEN p.total_cost > 0 THEN
          (
            (COALESCE(
              (SELECT SUM(t.amount)
               FROM transactions t
               WHERE t.property_id = p.id
                 AND t.type = 'dividende'
              ), 0
            ) / p.total_cost * 100)
            / (EXTRACT(EPOCH FROM AGE(CURRENT_TIMESTAMP, p.reservation_date)) / (30.44 * 86400))
            * 12
          ) - p.expected_roi
        ELSE -999
      END
    )
    ELSE 999
  END ASC;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_transactions_property_dividende
ON transactions(property_id, type)
WHERE type = 'dividende';

-- Commentaires
COMMENT ON VIEW property_performance IS 'Vue de suivi de performance ROI des propriétés avec alertes';

-- Confirmation
SELECT
  '✅ SYSTÈME DE SUIVI DE PERFORMANCE ROI CRÉÉ' as status,
  'Vue: property_performance' as vue,
  'Statuts: excellent, good, warning, critical, pending' as statuts;

-- Exemples d'utilisation
COMMENT ON VIEW property_performance IS '
Vue de suivi de performance ROI avec alertes automatiques

Exemples d''utilisation:

1. Voir tous les projets avec leur performance:
   SELECT * FROM property_performance;

2. Voir uniquement les projets en difficulté:
   SELECT * FROM property_performance
   WHERE performance_status IN (''warning'', ''critical'')
   ORDER BY roi_variance ASC;

3. Voir les meilleurs performeurs:
   SELECT * FROM property_performance
   WHERE performance_status = ''excellent''
   ORDER BY annualized_roi DESC;

4. Comparer ROI attendu vs réel:
   SELECT
     property_name,
     expected_roi,
     annualized_roi,
     roi_variance,
     performance_status
   FROM property_performance
   WHERE months_since_reservation > 3
   ORDER BY roi_variance DESC;

Statuts de performance:
- excellent: ROI > attendu +20%
- good: ROI ≈ attendu (±10%)
- warning: ROI < attendu 10-30%
- critical: ROI < attendu >30%
- pending: < 3 mois de données
';
