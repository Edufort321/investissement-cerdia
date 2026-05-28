-- Migration 192 : Support des propriétés directes dans le calendrier de réservation
-- Problème : investor_reservations.scenario_id référence scenarios(id) uniquement.
--            Les propriétés gérées via ProjetTab (table properties) n'apparaissent
--            jamais dans le calendrier car elles n'ont pas de scénario associé.
-- Solution :
--   1. Rendre scenario_id nullable dans investor_reservations
--   2. Ajouter property_id (ref properties) pour les réservations sur propriétés directes
--   3. Contrainte CHECK : l'un des deux doit être non-null
--   4. Mettre à jour la vue investor_occupation_usage pour gérer les deux cas
--   5. Mettre à jour la fonction check_investor_can_reserve pour les propriétés
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- 0. Élargir le CHECK de properties.status pour inclure livré, actif, vendu
--    (la contrainte originale ne les incluait pas)
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('reservation', 'en_construction', 'complete', 'en_location',
                    'livré', 'actif', 'vendu'));

-- 1. Rendre scenario_id nullable
ALTER TABLE investor_reservations
  ALTER COLUMN scenario_id DROP NOT NULL;

-- 2. Ajouter property_id (nullable, FK vers properties)
ALTER TABLE investor_reservations
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- 3. Contrainte : scenario_id OU property_id doit être non-null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_investor_reservations_unit_ref'
  ) THEN
    ALTER TABLE investor_reservations
      ADD CONSTRAINT chk_investor_reservations_unit_ref
      CHECK (scenario_id IS NOT NULL OR property_id IS NOT NULL);
  END IF;
END $$;

-- 4. Mise à jour de investor_occupation_usage pour gérer scenario_id OU property_id
-- DROP CASCADE nécessaire car investor_total_rights dépend de cette vue
DROP VIEW IF EXISTS investor_total_rights CASCADE;
DROP VIEW IF EXISTS investor_occupation_usage CASCADE;

CREATE VIEW investor_occupation_usage AS
SELECT
  ir.investor_id,
  ir.scenario_id,
  ir.property_id,
  COALESCE(s.owner_occupation_days, p.owner_occupation_days, 60) AS max_days_per_unit,
  COALESCE(
    SUM(ir.end_date - ir.start_date + 1) FILTER (WHERE ir.status = 'confirmed'),
    0
  ) AS days_used,
  COALESCE(s.owner_occupation_days, p.owner_occupation_days, 60) -
    COALESCE(
      SUM(ir.end_date - ir.start_date + 1) FILTER (WHERE ir.status = 'confirmed'),
      0
    ) AS days_remaining
FROM investor_reservations ir
LEFT JOIN scenarios s ON ir.scenario_id = s.id
LEFT JOIN properties p ON ir.property_id = p.id
WHERE ir.status = 'confirmed'
  AND EXTRACT(YEAR FROM ir.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY
  ir.investor_id,
  ir.scenario_id,
  ir.property_id,
  s.owner_occupation_days,
  p.owner_occupation_days;

-- Recréer investor_total_rights (supprimée par CASCADE ci-dessus)
CREATE VIEW investor_total_rights AS
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

-- 5. Mise à jour de check_investor_can_reserve pour accepter un property_id optionnel
--    Signature : p_scenario_id peut être NULL si p_property_id est fourni
CREATE OR REPLACE FUNCTION check_investor_can_reserve(
  p_investor_id   UUID,
  p_scenario_id   UUID,
  p_start_date    DATE,
  p_end_date      DATE,
  p_property_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  can_reserve          BOOLEAN,
  reason               TEXT,
  days_requested       INTEGER,
  days_available_total INTEGER,
  days_available_unit  INTEGER
) AS $$
DECLARE
  v_days_requested     INTEGER;
  v_max_days_unit      INTEGER;
  v_days_used_unit     INTEGER;
  v_days_remaining_unit INTEGER;
  v_total_days_entitled DECIMAL;
  v_total_days_used    INTEGER;
  v_total_days_remaining DECIMAL;
  v_investor_percentage DECIMAL;
  v_total_shares        DECIMAL;
  v_investor_shares     DECIMAL;
BEGIN
  v_days_requested := p_end_date - p_start_date + 1;

  -- ── CAS 1 : réservation sur un scénario ──────────────────────────────
  IF p_scenario_id IS NOT NULL THEN

    SELECT owner_occupation_days INTO v_max_days_unit
    FROM scenarios WHERE id = p_scenario_id;

    SELECT percentage INTO v_investor_percentage
    FROM investor_properties
    WHERE investor_id = p_investor_id AND property_id = p_scenario_id;

    IF v_investor_percentage IS NULL OR v_investor_percentage = 0 THEN
      RETURN QUERY SELECT FALSE,
        'Vous ne possédez pas de parts dans cette unité'::TEXT,
        v_days_requested, 0, 0;
      RETURN;
    END IF;

    SELECT COALESCE(SUM(end_date - start_date + 1), 0) INTO v_days_used_unit
    FROM investor_reservations
    WHERE investor_id = p_investor_id
      AND scenario_id = p_scenario_id
      AND status = 'confirmed'
      AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM p_start_date);

    v_days_remaining_unit := v_max_days_unit - v_days_used_unit;

    IF v_days_requested > v_days_remaining_unit THEN
      RETURN QUERY SELECT FALSE,
        ('Quota dépassé pour cette unité. Jours restants: ' || v_days_remaining_unit)::TEXT,
        v_days_requested, NULL::INTEGER, v_days_remaining_unit;
      RETURN;
    END IF;

    SELECT
      COALESCE(total_days_entitled, 0),
      COALESCE(total_days_used, 0),
      COALESCE(total_days_remaining, 0)
    INTO v_total_days_entitled, v_total_days_used, v_total_days_remaining
    FROM investor_total_rights
    WHERE investor_id = p_investor_id;

    IF v_days_requested > v_total_days_remaining THEN
      RETURN QUERY SELECT FALSE,
        ('Quota total dépassé. Jours restants tous projets: ' || v_total_days_remaining)::TEXT,
        v_days_requested, v_total_days_remaining::INTEGER, v_days_remaining_unit;
      RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, 'Réservation autorisée'::TEXT,
      v_days_requested, v_total_days_remaining::INTEGER, v_days_remaining_unit;
    RETURN;
  END IF;

  -- ── CAS 2 : réservation sur une propriété directe ───────────────────
  IF p_property_id IS NOT NULL THEN

    SELECT owner_occupation_days INTO v_max_days_unit
    FROM properties WHERE id = p_property_id;

    v_max_days_unit := COALESCE(v_max_days_unit, 60);

    -- Calcul du quota de l'investisseur basé sur ses parts dans le fonds
    SELECT COALESCE(SUM(number_of_shares), 0) INTO v_investor_shares
    FROM investor_investments
    WHERE investor_id = p_investor_id;

    SELECT COALESCE(SUM(number_of_shares), 0) INTO v_total_shares
    FROM investor_investments;

    IF v_total_shares > 0 THEN
      v_investor_percentage := (v_investor_shares / v_total_shares) * 100.0;
    ELSE
      v_investor_percentage := 0;
    END IF;

    IF v_investor_percentage = 0 THEN
      RETURN QUERY SELECT FALSE,
        'Vous ne possédez pas de parts dans le fonds'::TEXT,
        v_days_requested, 0, 0;
      RETURN;
    END IF;

    SELECT COALESCE(SUM(end_date - start_date + 1), 0) INTO v_days_used_unit
    FROM investor_reservations
    WHERE investor_id = p_investor_id
      AND property_id = p_property_id
      AND status = 'confirmed'
      AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM p_start_date);

    v_days_remaining_unit := ROUND((v_investor_percentage / 100.0) * v_max_days_unit)::INTEGER - v_days_used_unit;

    IF v_days_requested > v_days_remaining_unit THEN
      RETURN QUERY SELECT FALSE,
        ('Quota dépassé pour cette propriété. Jours restants: ' || v_days_remaining_unit)::TEXT,
        v_days_requested, NULL::INTEGER, v_days_remaining_unit;
      RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, 'Réservation autorisée'::TEXT,
      v_days_requested, v_days_remaining_unit, v_days_remaining_unit;
    RETURN;
  END IF;

  -- Aucune référence fournie
  RETURN QUERY SELECT FALSE, 'Aucune unité spécifiée'::TEXT, v_days_requested, 0, 0;
END;
$$ LANGUAGE plpgsql;

-- Index pour performance sur la nouvelle colonne
CREATE INDEX IF NOT EXISTS idx_investor_reservations_property_id
  ON investor_reservations(property_id);

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 192 OK';
  RAISE NOTICE '   investor_reservations.scenario_id → nullable';
  RAISE NOTICE '   investor_reservations.property_id → ajouté (FK properties)';
  RAISE NOTICE '   investor_occupation_usage → mis à jour (gère scenario OU property)';
  RAISE NOTICE '   check_investor_can_reserve → mis à jour (param p_property_id optionnel)';
END $$;
