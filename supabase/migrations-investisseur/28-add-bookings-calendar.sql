-- =====================================================
-- SCRIPT 28: CALENDRIER DES BOOKINGS POUR PROJETS
-- =====================================================
-- Description: Table pour gérer les réservations/bookings des propriétés
--              Permet de tracker les locations et calculer revenus réels
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- Table pour les bookings/réservations
CREATE TABLE IF NOT EXISTS scenario_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,

  -- Informations de réservation
  guest_name VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Tarification
  nightly_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Statut
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, pending, completed

  -- Notes et métadonnées
  notes TEXT,
  booking_source VARCHAR(100), -- Airbnb, Booking.com, Direct, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte: end_date doit être après start_date
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_bookings_scenario ON scenario_bookings(scenario_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON scenario_bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON scenario_bookings(status);

-- Fonction pour calculer automatiquement le total_amount
CREATE OR REPLACE FUNCTION calculate_booking_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer le nombre de nuits
  NEW.total_amount = (NEW.end_date - NEW.start_date) * NEW.nightly_rate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer total_amount automatiquement
CREATE TRIGGER trigger_calculate_booking_total
  BEFORE INSERT OR UPDATE ON scenario_bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_total();

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_bookings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bookings_timestamp
  BEFORE UPDATE ON scenario_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_timestamp();

-- Vue pour statistiques de bookings par scénario
CREATE OR REPLACE VIEW booking_stats AS
SELECT
  scenario_id,
  COUNT(*) as total_bookings,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
  SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END) as confirmed_revenue,
  MIN(start_date) as first_booking_date,
  MAX(end_date) as last_booking_date
FROM scenario_bookings
GROUP BY scenario_id;

-- Commentaires sur les colonnes
COMMENT ON TABLE scenario_bookings IS 'Réservations/bookings pour les propriétés en location courte durée';
COMMENT ON COLUMN scenario_bookings.scenario_id IS 'Référence au scénario/projet';
COMMENT ON COLUMN scenario_bookings.guest_name IS 'Nom du locataire/invité';
COMMENT ON COLUMN scenario_bookings.start_date IS 'Date de début de la réservation';
COMMENT ON COLUMN scenario_bookings.end_date IS 'Date de fin de la réservation';
COMMENT ON COLUMN scenario_bookings.nightly_rate IS 'Tarif par nuit';
COMMENT ON COLUMN scenario_bookings.total_amount IS 'Montant total (calculé automatiquement)';
COMMENT ON COLUMN scenario_bookings.status IS 'Statut: confirmed, cancelled, pending, completed';
COMMENT ON COLUMN scenario_bookings.booking_source IS 'Source de la réservation (Airbnb, Booking.com, etc.)';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 28: CALENDRIER BOOKINGS CRÉÉ';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '  - scenario_bookings: Gestion des réservations';
  RAISE NOTICE '';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - booking_stats: Statistiques par scénario';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctionnalités:';
  RAISE NOTICE '  - Calcul automatique du montant total';
  RAISE NOTICE '  - Contrainte dates valides (fin > début)';
  RAISE NOTICE '  - Trigger auto-update de updated_at';
  RAISE NOTICE '  - Tracking du statut des réservations';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Prêt pour gestion du calendrier de bookings';
END $$;
