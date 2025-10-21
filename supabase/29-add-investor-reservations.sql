-- =====================================================
-- SCRIPT 29: CALENDRIER RÉSERVATIONS INVESTISSEURS
-- =====================================================
-- Description: Système de réservation des unités par les investisseurs
--              Une ligne par projet, clic simple pour réserver
-- Dépendances: Script 20 (scenarios), Script 04 (investors)
-- =====================================================

-- Table pour les réservations d'investisseurs
CREATE TABLE IF NOT EXISTS investor_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,

  -- Dates de réservation
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Statut
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, pending

  -- Métadonnées
  notes TEXT,
  reserved_by UUID REFERENCES investors(id), -- Qui a créé la réservation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte: end_date doit être après start_date
  CONSTRAINT valid_reservation_dates CHECK (end_date >= start_date)
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_investor_reservations_scenario ON investor_reservations(scenario_id);
CREATE INDEX IF NOT EXISTS idx_investor_reservations_investor ON investor_reservations(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_reservations_dates ON investor_reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_investor_reservations_status ON investor_reservations(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_investor_reservations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_investor_reservations_timestamp
  BEFORE UPDATE ON investor_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_reservations_timestamp();

-- Vue pour statistiques par scénario
CREATE OR REPLACE VIEW investor_reservation_stats AS
SELECT
  scenario_id,
  COUNT(*) as total_reservations,
  COUNT(DISTINCT investor_id) as unique_investors,
  SUM(end_date - start_date + 1) as total_days_reserved,
  MIN(start_date) as first_reservation,
  MAX(end_date) as last_reservation
FROM investor_reservations
WHERE status = 'confirmed'
GROUP BY scenario_id;

-- Table pour configuration API de gestion locative
CREATE TABLE IF NOT EXISTS property_management_api (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE UNIQUE,

  -- Configuration API
  provider VARCHAR(100), -- Nom du fournisseur (ex: Guesty, Hostaway, etc.)
  api_key TEXT,
  api_secret TEXT,
  api_endpoint TEXT,
  property_id VARCHAR(255), -- ID de la propriété dans le système de gestion

  -- Synchronisation
  auto_sync BOOLEAN DEFAULT false,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50), -- success, failed, pending

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour API config
CREATE INDEX IF NOT EXISTS idx_property_api_scenario ON property_management_api(scenario_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER trigger_update_property_api_timestamp
  BEFORE UPDATE ON property_management_api
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_reservations_timestamp();

-- Commentaires sur les colonnes
COMMENT ON TABLE investor_reservations IS 'Réservations des unités par les investisseurs pour usage personnel';
COMMENT ON COLUMN investor_reservations.scenario_id IS 'Référence au projet/condo';
COMMENT ON COLUMN investor_reservations.investor_id IS 'Investisseur qui utilise l''unité';
COMMENT ON COLUMN investor_reservations.reserved_by IS 'Investisseur qui a créé la réservation';
COMMENT ON COLUMN investor_reservations.start_date IS 'Date de début de réservation';
COMMENT ON COLUMN investor_reservations.end_date IS 'Date de fin de réservation';
COMMENT ON COLUMN investor_reservations.status IS 'Statut: confirmed, cancelled, pending';

COMMENT ON TABLE property_management_api IS 'Configuration API pour synchronisation avec système de gestion locative';
COMMENT ON COLUMN property_management_api.provider IS 'Nom du fournisseur API (Guesty, Hostaway, etc.)';
COMMENT ON COLUMN property_management_api.auto_sync IS 'Synchronisation automatique activée';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 29: CALENDRIER RÉSERVATIONS INVESTISSEURS CRÉÉ';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '  - investor_reservations: Réservations des investisseurs';
  RAISE NOTICE '  - property_management_api: Configuration API gestion locative';
  RAISE NOTICE '';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - investor_reservation_stats: Statistiques par scénario';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctionnalités:';
  RAISE NOTICE '  - Calendrier multi-lignes (une ligne par projet)';
  RAISE NOTICE '  - Réservation rapide par clic';
  RAISE NOTICE '  - Sélection investisseur dans liste';
  RAISE NOTICE '  - Contrainte dates valides';
  RAISE NOTICE '  - Support API gestion locative';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Prêt pour calendrier de réservations investisseurs';
END $$;
