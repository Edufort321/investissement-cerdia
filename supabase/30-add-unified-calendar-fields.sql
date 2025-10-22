-- =====================================================
-- SCRIPT 30: CALENDRIER UNIFIÉ - AJOUT CHAMPS GESTION
-- =====================================================
-- Description: Ajoute champs pour système de quota d'occupation
--              et info compagnie de gestion
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- Créer la table de liaison investisseur-propriété si elle n'existe pas
CREATE TABLE IF NOT EXISTS investor_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  percentage DECIMAL(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  acquired_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(investor_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_properties_investor ON investor_properties(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_properties_property ON investor_properties(property_id);

COMMENT ON TABLE investor_properties IS 'Liaison investisseur-propriété avec pourcentage de parts';
COMMENT ON COLUMN investor_properties.percentage IS 'Pourcentage de parts détenues (0-100)';

-- Ajouter colonnes pour quota d'occupation et compagnie de gestion
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS owner_occupation_days INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS management_company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS management_company_contact VARCHAR(100),
ADD COLUMN IF NOT EXISTS management_company_email VARCHAR(255);

-- Commentaires sur les colonnes
COMMENT ON COLUMN scenarios.owner_occupation_days IS 'Nombre maximum de jours par an pour usage personnel des propriétaires';
COMMENT ON COLUMN scenarios.management_company_name IS 'Nom de la compagnie de gestion locative';
COMMENT ON COLUMN scenarios.management_company_contact IS 'Numéro de contact de la compagnie';
COMMENT ON COLUMN scenarios.management_company_email IS 'Email de contact de la compagnie';

-- Ajouter colonne pour type de réservation dans bookings
ALTER TABLE scenario_bookings
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'commercial';

COMMENT ON COLUMN scenario_bookings.booking_type IS 'Type: commercial (gestion locative) ou owner (usage personnel investisseur)';

-- Vue pour calculer les jours utilisés par investisseur par scénario
CREATE OR REPLACE VIEW investor_occupation_usage AS
SELECT
  ir.investor_id,
  ir.scenario_id,
  s.owner_occupation_days as max_days_per_unit,
  COUNT(*) FILTER (WHERE ir.status = 'confirmed') as days_used,
  s.owner_occupation_days - COUNT(*) FILTER (WHERE ir.status = 'confirmed') as days_remaining
FROM investor_reservations ir
JOIN scenarios s ON ir.scenario_id = s.id
WHERE ir.status = 'confirmed'
  AND EXTRACT(YEAR FROM ir.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY ir.investor_id, ir.scenario_id, s.owner_occupation_days;

-- Vue pour calculer les droits totaux d'un investisseur (basé sur ses parts)
CREATE OR REPLACE VIEW investor_total_rights AS
SELECT
  i.id as investor_id,
  i.first_name || ' ' || i.last_name as investor_name,
  SUM(
    CASE
      WHEN ip.percentage IS NOT NULL AND s.owner_occupation_days IS NOT NULL
      THEN (ip.percentage / 100.0) * s.owner_occupation_days
      ELSE 0
    END
  ) as total_days_entitled,
  SUM(
    CASE
      WHEN iou.days_used IS NOT NULL
      THEN iou.days_used
      ELSE 0
    END
  ) as total_days_used,
  SUM(
    CASE
      WHEN ip.percentage IS NOT NULL AND s.owner_occupation_days IS NOT NULL
      THEN (ip.percentage / 100.0) * s.owner_occupation_days
      ELSE 0
    END
  ) - SUM(
    CASE
      WHEN iou.days_used IS NOT NULL
      THEN iou.days_used
      ELSE 0
    END
  ) as total_days_remaining
FROM investors i
LEFT JOIN investor_properties ip ON i.id = ip.investor_id
LEFT JOIN scenarios s ON ip.property_id = s.id
LEFT JOIN investor_occupation_usage iou ON i.id = iou.investor_id AND s.id = iou.scenario_id
WHERE s.status = 'purchased'
GROUP BY i.id, i.first_name, i.last_name;

-- Fonction pour vérifier si un investisseur peut réserver
CREATE OR REPLACE FUNCTION check_investor_can_reserve(
  p_investor_id UUID,
  p_scenario_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  can_reserve BOOLEAN,
  reason TEXT,
  days_requested INTEGER,
  days_available_total INTEGER,
  days_available_unit INTEGER
) AS $$
DECLARE
  v_days_requested INTEGER;
  v_max_days_unit INTEGER;
  v_days_used_unit INTEGER;
  v_days_remaining_unit INTEGER;
  v_total_days_entitled DECIMAL;
  v_total_days_used INTEGER;
  v_total_days_remaining DECIMAL;
  v_investor_percentage DECIMAL;
BEGIN
  -- Calculer nombre de jours demandés
  v_days_requested := p_end_date - p_start_date + 1;

  -- Récupérer le quota max par unité
  SELECT owner_occupation_days INTO v_max_days_unit
  FROM scenarios WHERE id = p_scenario_id;

  -- Récupérer le % de l'investisseur dans cette unité
  SELECT percentage INTO v_investor_percentage
  FROM investor_properties
  WHERE investor_id = p_investor_id
    AND property_id = p_scenario_id;

  -- Si l'investisseur ne possède pas de parts, refuser
  IF v_investor_percentage IS NULL OR v_investor_percentage = 0 THEN
    RETURN QUERY SELECT FALSE, 'Vous ne possédez pas de parts dans cette unité', v_days_requested, 0, 0;
    RETURN;
  END IF;

  -- Jours déjà utilisés sur cette unité cette année
  SELECT COALESCE(SUM(end_date - start_date + 1), 0) INTO v_days_used_unit
  FROM investor_reservations
  WHERE investor_id = p_investor_id
    AND scenario_id = p_scenario_id
    AND status = 'confirmed'
    AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM p_start_date);

  v_days_remaining_unit := v_max_days_unit - v_days_used_unit;

  -- Vérifier quota par unité
  IF v_days_requested > v_days_remaining_unit THEN
    RETURN QUERY SELECT
      FALSE,
      'Quota dépassé pour cette unité. Jours restants: ' || v_days_remaining_unit,
      v_days_requested,
      NULL::INTEGER,
      v_days_remaining_unit;
    RETURN;
  END IF;

  -- Récupérer les droits totaux de l'investisseur (tous projets confondus)
  SELECT
    COALESCE(total_days_entitled, 0),
    COALESCE(total_days_used, 0),
    COALESCE(total_days_remaining, 0)
  INTO v_total_days_entitled, v_total_days_used, v_total_days_remaining
  FROM investor_total_rights
  WHERE investor_id = p_investor_id;

  -- Vérifier quota total
  IF v_days_requested > v_total_days_remaining THEN
    RETURN QUERY SELECT
      FALSE,
      'Quota total dépassé. Jours restants tous projets: ' || v_total_days_remaining,
      v_days_requested,
      v_total_days_remaining::INTEGER,
      v_days_remaining_unit;
    RETURN;
  END IF;

  -- Tout est OK
  RETURN QUERY SELECT
    TRUE,
    'Réservation autorisée',
    v_days_requested,
    v_total_days_remaining::INTEGER,
    v_days_remaining_unit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 30: CALENDRIER UNIFIÉ - CHAMPS AJOUTÉS';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Modifications apportées:';
  RAISE NOTICE '  - owner_occupation_days ajouté à scenarios';
  RAISE NOTICE '  - Info compagnie de gestion ajoutée (nom, contact, email)';
  RAISE NOTICE '  - booking_type ajouté à scenario_bookings';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - investor_occupation_usage: Usage par investisseur/projet';
  RAISE NOTICE '  - investor_total_rights: Droits totaux par investisseur';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - check_investor_can_reserve(): Validation des quotas';
  RAISE NOTICE ' ';
  RAISE NOTICE '✓ Système de quota unifié prêt!';
END $$;
