-- =====================================================
-- SCRIPT 32: SYNCHRONISATION REVENUS BOOKINGS
-- =====================================================
-- Description: Fonction pour synchroniser automatiquement
--              les revenus des bookings vers actual_values
-- Dépendances: Script 30 (calendrier unifié)
-- =====================================================

-- =====================================================
-- FONCTION: CALCULER REVENUS ANNUELS PAR PROJET
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_annual_booking_revenue(
  p_scenario_id UUID,
  p_year INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_revenue NUMERIC;
BEGIN
  -- Calculer le revenu total des bookings confirmés/complétés pour l'année
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_total_revenue
  FROM scenario_bookings
  WHERE scenario_id = p_scenario_id
    AND status IN ('confirmed', 'completed')
    AND EXTRACT(YEAR FROM check_in) = p_year;

  RETURN v_total_revenue;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: SYNCHRONISER REVENUS POUR UN PROJET
-- =====================================================
CREATE OR REPLACE FUNCTION sync_booking_revenue_for_scenario(
  p_scenario_id UUID,
  p_year INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  revenue_amount NUMERIC
) AS $$
DECLARE
  v_revenue NUMERIC;
  v_existing_record UUID;
BEGIN
  -- Calculer le revenu
  v_revenue := calculate_annual_booking_revenue(p_scenario_id, p_year);

  -- Vérifier si un enregistrement existe déjà
  SELECT id INTO v_existing_record
  FROM scenario_actual_values
  WHERE scenario_id = p_scenario_id
    AND year = p_year;

  -- Insérer ou mettre à jour
  IF v_existing_record IS NOT NULL THEN
    -- Mettre à jour l'enregistrement existant
    UPDATE scenario_actual_values
    SET rental_income = v_revenue,
        updated_at = NOW()
    WHERE id = v_existing_record;

    RETURN QUERY SELECT TRUE, 'Revenus mis à jour avec succès', v_revenue;
  ELSE
    -- Créer un nouvel enregistrement
    INSERT INTO scenario_actual_values (
      scenario_id,
      year,
      rental_income,
      created_at,
      updated_at
    )
    VALUES (
      p_scenario_id,
      p_year,
      v_revenue,
      NOW(),
      NOW()
    );

    RETURN QUERY SELECT TRUE, 'Revenus créés avec succès', v_revenue;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Erreur: ' || SQLERRM, 0::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: SYNCHRONISER TOUS LES PROJETS
-- =====================================================
CREATE OR REPLACE FUNCTION sync_all_booking_revenues(
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  scenario_id UUID,
  scenario_name TEXT,
  year INTEGER,
  success BOOLEAN,
  message TEXT,
  revenue_amount NUMERIC
) AS $$
DECLARE
  v_year INTEGER;
  v_scenario RECORD;
  v_sync_result RECORD;
BEGIN
  -- Par défaut, année en cours
  IF p_year IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  ELSE
    v_year := p_year;
  END IF;

  -- Parcourir tous les scénarios achetés
  FOR v_scenario IN
    SELECT id, name
    FROM scenarios
    WHERE status = 'purchased'
    ORDER BY name
  LOOP
    -- Synchroniser les revenus pour ce scénario
    FOR v_sync_result IN
      SELECT * FROM sync_booking_revenue_for_scenario(v_scenario.id, v_year)
    LOOP
      RETURN QUERY SELECT
        v_scenario.id,
        v_scenario.name,
        v_year,
        v_sync_result.success,
        v_sync_result.message,
        v_sync_result.revenue_amount;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: CALCULER FRAIS DE GESTION DEPUIS BOOKINGS
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_annual_management_fees(
  p_scenario_id UUID,
  p_year INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_fees NUMERIC;
  v_management_percentage NUMERIC;
  v_total_revenue NUMERIC;
BEGIN
  -- Récupérer le % de frais de gestion du scénario
  SELECT promoter_data->'management_fees'
  INTO v_management_percentage
  FROM scenarios
  WHERE id = p_scenario_id;

  -- Si pas défini, utiliser 10% par défaut
  IF v_management_percentage IS NULL THEN
    v_management_percentage := 10;
  END IF;

  -- Calculer le revenu total
  v_total_revenue := calculate_annual_booking_revenue(p_scenario_id, p_year);

  -- Calculer les frais de gestion
  v_total_fees := v_total_revenue * (v_management_percentage / 100.0);

  RETURN v_total_fees;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: SYNCHRONISATION COMPLÈTE (REVENUS + FRAIS)
-- =====================================================
CREATE OR REPLACE FUNCTION sync_complete_booking_data(
  p_scenario_id UUID,
  p_year INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  revenue_amount NUMERIC,
  management_fees NUMERIC,
  net_income NUMERIC
) AS $$
DECLARE
  v_revenue NUMERIC;
  v_fees NUMERIC;
  v_net NUMERIC;
  v_existing_record UUID;
BEGIN
  -- Calculer revenus et frais
  v_revenue := calculate_annual_booking_revenue(p_scenario_id, p_year);
  v_fees := calculate_annual_management_fees(p_scenario_id, p_year);
  v_net := v_revenue - v_fees;

  -- Vérifier si un enregistrement existe
  SELECT id INTO v_existing_record
  FROM scenario_actual_values
  WHERE scenario_id = p_scenario_id
    AND year = p_year;

  -- Insérer ou mettre à jour
  IF v_existing_record IS NOT NULL THEN
    UPDATE scenario_actual_values
    SET rental_income = v_revenue,
        management_fees = v_fees,
        net_income = v_net,
        updated_at = NOW()
    WHERE id = v_existing_record;

    RETURN QUERY SELECT TRUE, 'Données complètes mises à jour', v_revenue, v_fees, v_net;
  ELSE
    INSERT INTO scenario_actual_values (
      scenario_id,
      year,
      rental_income,
      management_fees,
      net_income,
      created_at,
      updated_at
    )
    VALUES (
      p_scenario_id,
      p_year,
      v_revenue,
      v_fees,
      v_net,
      NOW(),
      NOW()
    );

    RETURN QUERY SELECT TRUE, 'Données complètes créées', v_revenue, v_fees, v_net;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'Erreur: ' || SQLERRM, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: AUTO-SYNC LORS MODIFICATION BOOKING
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_sync_booking_revenue()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_should_sync BOOLEAN := FALSE;
BEGIN
  -- Vérifier si on doit synchroniser (seulement pour bookings confirmés/complétés)
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('confirmed', 'completed') THEN
      v_should_sync := TRUE;
      v_year := EXTRACT(YEAR FROM OLD.check_in);
      PERFORM sync_complete_booking_data(OLD.scenario_id, v_year);
    END IF;
    RETURN OLD;
  ELSE
    -- INSERT ou UPDATE
    IF NEW.status IN ('confirmed', 'completed') THEN
      v_should_sync := TRUE;
      v_year := EXTRACT(YEAR FROM NEW.check_in);
      PERFORM sync_complete_booking_data(NEW.scenario_id, v_year);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur scenario_bookings
DROP TRIGGER IF EXISTS auto_sync_booking_revenue ON scenario_bookings;
CREATE TRIGGER auto_sync_booking_revenue
AFTER INSERT OR UPDATE OR DELETE ON scenario_bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_booking_revenue();

-- =====================================================
-- VUE: RÉSUMÉ SYNCHRONISATION REVENUS
-- =====================================================
CREATE OR REPLACE VIEW booking_revenue_sync_status AS
SELECT
  s.id as scenario_id,
  s.name as scenario_name,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as current_year,
  calculate_annual_booking_revenue(s.id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) as calculated_revenue,
  av.rental_income as synced_revenue,
  CASE
    WHEN av.rental_income IS NULL THEN 'Non synchronisé'
    WHEN av.rental_income = calculate_annual_booking_revenue(s.id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) THEN 'À jour'
    ELSE 'Désynchronisé'
  END as sync_status,
  av.updated_at as last_sync
FROM scenarios s
LEFT JOIN scenario_actual_values av ON s.id = av.scenario_id
  AND av.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
WHERE s.status = 'purchased'
ORDER BY s.name;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 32: SYNCHRONISATION REVENUS BOOKINGS CRÉÉ';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - calculate_annual_booking_revenue(): Calcul revenus annuels';
  RAISE NOTICE '  - sync_booking_revenue_for_scenario(): Sync un projet';
  RAISE NOTICE '  - sync_all_booking_revenues(): Sync tous les projets';
  RAISE NOTICE '  - calculate_annual_management_fees(): Calcul frais gestion';
  RAISE NOTICE '  - sync_complete_booking_data(): Sync complète (revenus + frais)';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Triggers créés:';
  RAISE NOTICE '  - auto_sync_booking_revenue: Auto-sync lors modification booking';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - booking_revenue_sync_status: Statut de synchronisation';
  RAISE NOTICE ' ';
  RAISE NOTICE '✓ Synchronisation automatique des revenus activée!';
END $$;
