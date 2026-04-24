-- Migration 119: Jours propriétaire et corrections réservations
--
-- 1. Ajoute owner_occupation_days à la table properties (pour ProjetTab)
-- 2. Corrige investor_occupation_usage: COUNT(*) → SUM(end_date - start_date + 1)
--    pour supporter les réservations multi-jours
-- 3. Recrée investor_total_rights qui dépend de la vue corrigée

-- 1. Ajouter owner_occupation_days à properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS owner_occupation_days INTEGER DEFAULT 60;

COMMENT ON COLUMN properties.owner_occupation_days IS
  'Nombre de jours par an autorisés pour usage personnel selon contrat d''achat';

-- 2. Corriger investor_occupation_usage: utiliser la somme des jours plutôt que COUNT(*)
--    COUNT(*) ne comptait qu'une ligne par réservation, pas le nombre réel de jours
CREATE OR REPLACE VIEW investor_occupation_usage AS
SELECT
  ir.investor_id,
  ir.scenario_id,
  s.owner_occupation_days AS max_days_per_unit,
  COALESCE(SUM(ir.end_date - ir.start_date + 1) FILTER (WHERE ir.status = 'confirmed'), 0) AS days_used,
  s.owner_occupation_days - COALESCE(SUM(ir.end_date - ir.start_date + 1) FILTER (WHERE ir.status = 'confirmed'), 0) AS days_remaining
FROM investor_reservations ir
JOIN scenarios s ON ir.scenario_id = s.id
WHERE ir.status = 'confirmed'
  AND EXTRACT(YEAR FROM ir.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY ir.investor_id, ir.scenario_id, s.owner_occupation_days;

-- 3. Recréer investor_total_rights (même définition, dépend de la vue corrigée)
CREATE OR REPLACE VIEW investor_total_rights AS
SELECT
  i.id AS investor_id,
  i.first_name || ' ' || i.last_name AS investor_name,
  COALESCE(SUM(
    CASE
      WHEN ip.percentage IS NOT NULL AND s.owner_occupation_days IS NOT NULL
      THEN (ip.percentage / 100.0) * s.owner_occupation_days
      ELSE 0
    END
  ), 0) AS total_days_entitled,
  COALESCE(SUM(
    CASE WHEN iou.days_used IS NOT NULL THEN iou.days_used ELSE 0 END
  ), 0) AS total_days_used,
  COALESCE(SUM(
    CASE
      WHEN ip.percentage IS NOT NULL AND s.owner_occupation_days IS NOT NULL
      THEN (ip.percentage / 100.0) * s.owner_occupation_days
      ELSE 0
    END
  ), 0) - COALESCE(SUM(
    CASE WHEN iou.days_used IS NOT NULL THEN iou.days_used ELSE 0 END
  ), 0) AS total_days_remaining
FROM investors i
LEFT JOIN investor_properties ip ON i.id = ip.investor_id
LEFT JOIN scenarios s ON ip.property_id = s.id AND s.status = 'purchased'
LEFT JOIN investor_occupation_usage iou ON i.id = iou.investor_id AND s.id = iou.scenario_id
GROUP BY i.id, i.first_name, i.last_name;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 119: owner_occupation_days ajouté à properties';
  RAISE NOTICE '   investor_occupation_usage corrigée (SUM jours, pas COUNT lignes)';
  RAISE NOTICE '   investor_total_rights recrée sur base corrigée';
END $$;
