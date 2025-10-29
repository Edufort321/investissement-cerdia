-- ==========================================
-- NAV HISTORICAL TRACKING SYSTEM
-- Permet de suivre l'évolution du NAV dans le temps
-- ==========================================

-- ============================================
-- 1. Création de la table nav_history
-- ============================================
CREATE TABLE IF NOT EXISTS nav_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,

  -- Métriques principales
  total_investments DECIMAL(15, 2) NOT NULL,
  property_purchases DECIMAL(15, 2) NOT NULL,
  properties_current_value DECIMAL(15, 2) NOT NULL,
  properties_appreciation DECIMAL(15, 2) NOT NULL,
  net_asset_value DECIMAL(15, 2) NOT NULL,

  -- NAV par action
  total_shares INTEGER NOT NULL,
  nav_per_share DECIMAL(10, 4) NOT NULL,

  -- Performance
  nav_change_pct DECIMAL(10, 4),

  -- Détails optionnels
  cash_balance DECIMAL(15, 2),
  total_properties INTEGER,
  notes TEXT,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte d'unicité: une seule snapshot par date
  CONSTRAINT nav_history_unique_date UNIQUE (snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_nav_history_snapshot_date ON nav_history(snapshot_date DESC);

COMMENT ON TABLE nav_history IS 'Historique des snapshots du NAV pour suivi de performance';

-- ============================================
-- 2. Fonction pour créer un snapshot du NAV
-- ============================================
CREATE OR REPLACE FUNCTION snapshot_nav(p_snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_nav_data RECORD;
  v_total_shares INTEGER;
  v_cash_balance DECIMAL(15, 2);
  v_total_properties INTEGER;
BEGIN
  -- Calculer le NAV à la date donnée
  SELECT * INTO v_nav_data
  FROM calculate_realistic_nav_v2(p_snapshot_date);

  IF v_nav_data IS NULL THEN
    RAISE EXCEPTION 'Failed to calculate NAV for date %', p_snapshot_date;
  END IF;

  -- Récupérer les métriques supplémentaires
  SELECT COUNT(*) INTO v_total_properties
  FROM properties
  WHERE status = 'active';

  -- Calculer le solde de trésorerie (somme des transactions non liées aux achats de propriétés)
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_balance
  FROM transactions
  WHERE transaction_date <= p_snapshot_date;

  -- Récupérer le total des parts
  SELECT COALESCE(SUM(shares), 0) INTO v_total_shares
  FROM investors
  WHERE status = 'active';

  IF v_total_shares = 0 THEN
    v_total_shares := 1; -- Éviter division par zéro
  END IF;

  -- Insérer le snapshot (ou mettre à jour s'il existe déjà pour cette date)
  INSERT INTO nav_history (
    snapshot_date,
    total_investments,
    property_purchases,
    properties_current_value,
    properties_appreciation,
    net_asset_value,
    total_shares,
    nav_per_share,
    nav_change_pct,
    cash_balance,
    total_properties
  ) VALUES (
    p_snapshot_date,
    v_nav_data.total_investments,
    v_nav_data.property_purchases,
    v_nav_data.properties_current_value,
    v_nav_data.properties_appreciation,
    v_nav_data.net_asset_value,
    v_total_shares,
    v_nav_data.nav_per_share,
    v_nav_data.nav_change_pct,
    v_cash_balance,
    v_total_properties
  )
  ON CONFLICT (snapshot_date)
  DO UPDATE SET
    total_investments = EXCLUDED.total_investments,
    property_purchases = EXCLUDED.property_purchases,
    properties_current_value = EXCLUDED.properties_current_value,
    properties_appreciation = EXCLUDED.properties_appreciation,
    net_asset_value = EXCLUDED.net_asset_value,
    total_shares = EXCLUDED.total_shares,
    nav_per_share = EXCLUDED.nav_per_share,
    nav_change_pct = EXCLUDED.nav_change_pct,
    cash_balance = EXCLUDED.cash_balance,
    total_properties = EXCLUDED.total_properties,
    created_at = NOW()
  RETURNING id INTO v_snapshot_id;

  RAISE NOTICE 'NAV snapshot created for % (ID: %)', p_snapshot_date, v_snapshot_id;
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION snapshot_nav IS 'Crée un snapshot du NAV pour une date donnée';

-- ============================================
-- 3. Vue pour afficher l'historique NAV avec calcul des variations
-- ============================================
CREATE OR REPLACE VIEW v_nav_history_with_changes AS
SELECT
  h.*,
  -- Variation depuis snapshot précédent
  LAG(h.nav_per_share) OVER (ORDER BY h.snapshot_date) as previous_nav_per_share,
  CASE
    WHEN LAG(h.nav_per_share) OVER (ORDER BY h.snapshot_date) > 0 THEN
      ((h.nav_per_share - LAG(h.nav_per_share) OVER (ORDER BY h.snapshot_date))
       / LAG(h.nav_per_share) OVER (ORDER BY h.snapshot_date) * 100)
    ELSE NULL
  END as period_change_pct,

  -- Variation depuis le début
  FIRST_VALUE(h.nav_per_share) OVER (ORDER BY h.snapshot_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as first_nav_per_share,
  CASE
    WHEN FIRST_VALUE(h.nav_per_share) OVER (ORDER BY h.snapshot_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) > 0 THEN
      ((h.nav_per_share - FIRST_VALUE(h.nav_per_share) OVER (ORDER BY h.snapshot_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING))
       / FIRST_VALUE(h.nav_per_share) OVER (ORDER BY h.snapshot_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) * 100)
    ELSE NULL
  END as total_change_pct,

  -- Jours depuis snapshot précédent
  snapshot_date - LAG(snapshot_date) OVER (ORDER BY snapshot_date) as days_since_previous
FROM nav_history h
ORDER BY h.snapshot_date DESC;

COMMENT ON VIEW v_nav_history_with_changes IS 'Historique NAV avec calculs de variations';

-- ============================================
-- 4. Fonction pour générer des snapshots mensuels automatiquement
-- ============================================
CREATE OR REPLACE FUNCTION generate_monthly_nav_snapshots(
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  snapshot_date DATE,
  snapshot_id UUID,
  status TEXT
) AS $$
DECLARE
  v_current_date DATE;
  v_snapshot_id UUID;
BEGIN
  v_current_date := DATE_TRUNC('month', p_start_date)::DATE;

  WHILE v_current_date <= p_end_date LOOP
    BEGIN
      -- Créer snapshot au dernier jour du mois
      v_current_date := (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month - 1 day')::DATE;

      -- Ne pas créer de snapshot dans le futur
      IF v_current_date > CURRENT_DATE THEN
        v_current_date := CURRENT_DATE;
      END IF;

      v_snapshot_id := snapshot_nav(v_current_date);

      snapshot_date := v_current_date;
      snapshot_id := v_snapshot_id;
      status := 'created';
      RETURN NEXT;

      -- Passer au mois suivant
      v_current_date := (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month')::DATE;

    EXCEPTION WHEN OTHERS THEN
      snapshot_date := v_current_date;
      snapshot_id := NULL;
      status := 'error: ' || SQLERRM;
      RETURN NEXT;

      -- Continuer même en cas d'erreur
      v_current_date := (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month')::DATE;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_monthly_nav_snapshots IS 'Génère des snapshots mensuels du NAV entre deux dates';

-- ============================================
-- 5. Vue pour résumé NAV actuel vs historique
-- ============================================
CREATE OR REPLACE VIEW v_nav_summary AS
SELECT
  -- NAV actuel (calculé en temps réel)
  current_nav.net_asset_value as current_nav,
  current_nav.nav_per_share as current_nav_per_share,
  current_nav.properties_appreciation as current_appreciation,

  -- Dernier snapshot
  last_snapshot.snapshot_date as last_snapshot_date,
  last_snapshot.nav_per_share as last_snapshot_nav_per_share,

  -- Premier snapshot (point de départ)
  first_snapshot.snapshot_date as first_snapshot_date,
  first_snapshot.nav_per_share as first_snapshot_nav_per_share,

  -- Performance totale depuis le début
  CASE
    WHEN first_snapshot.nav_per_share > 0 THEN
      ((current_nav.nav_per_share - first_snapshot.nav_per_share)
       / first_snapshot.nav_per_share * 100)
    ELSE NULL
  END as total_performance_pct,

  -- Performance depuis dernier snapshot
  CASE
    WHEN last_snapshot.nav_per_share > 0 THEN
      ((current_nav.nav_per_share - last_snapshot.nav_per_share)
       / last_snapshot.nav_per_share * 100)
    ELSE NULL
  END as since_last_snapshot_pct,

  -- Métriques additionnelles
  current_nav.total_investments,
  current_nav.properties_current_value,
  (SELECT COUNT(*) FROM nav_history) as total_snapshots,
  (SELECT MAX(snapshot_date) FROM nav_history) as latest_snapshot_date
FROM calculate_realistic_nav_v2(CURRENT_DATE) current_nav
CROSS JOIN LATERAL (
  SELECT * FROM nav_history ORDER BY snapshot_date DESC LIMIT 1
) last_snapshot
CROSS JOIN LATERAL (
  SELECT * FROM nav_history ORDER BY snapshot_date ASC LIMIT 1
) first_snapshot;

COMMENT ON VIEW v_nav_summary IS 'Résumé NAV actuel avec comparaison historique';

-- ============================================
-- 6. Backfill: Créer snapshots mensuels depuis mars 2025
-- ============================================
DO $$
DECLARE
  v_start_date DATE := '2025-03-01';
  v_result RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting NAV history backfill from %...', v_start_date;

  FOR v_result IN
    SELECT * FROM generate_monthly_nav_snapshots(v_start_date, CURRENT_DATE)
  LOOP
    IF v_result.status = 'created' THEN
      v_count := v_count + 1;
      RAISE NOTICE 'Created snapshot for % (ID: %)', v_result.snapshot_date, v_result.snapshot_id;
    ELSE
      RAISE WARNING 'Failed snapshot for %: %', v_result.snapshot_date, v_result.status;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % snapshots created', v_count;
END $$;

-- ============================================
-- 7. Fonction helper pour obtenir le NAV à une date donnée
-- ============================================
CREATE OR REPLACE FUNCTION get_nav_at_date(p_date DATE)
RETURNS TABLE (
  nav_per_share DECIMAL(10, 4),
  net_asset_value DECIMAL(15, 2),
  source TEXT
) AS $$
BEGIN
  -- D'abord chercher dans l'historique
  RETURN QUERY
  SELECT
    h.nav_per_share,
    h.net_asset_value,
    'historical'::TEXT as source
  FROM nav_history h
  WHERE h.snapshot_date = p_date
  LIMIT 1;

  -- Si pas trouvé, calculer en temps réel
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      calc.nav_per_share,
      calc.net_asset_value,
      'calculated'::TEXT as source
    FROM calculate_realistic_nav_v2(p_date) calc;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_nav_at_date IS 'Récupère le NAV pour une date donnée (historique ou calculé)';

-- ============================================
-- Vérification finale
-- ============================================
SELECT
  '✅ NAV HISTORY TRACKING ACTIVÉ' as status,
  'Table: nav_history' as table_created,
  'Fonctions: snapshot_nav, generate_monthly_nav_snapshots, get_nav_at_date' as functions,
  'Vues: v_nav_history_with_changes, v_nav_summary' as views,
  (SELECT COUNT(*) FROM nav_history) as snapshots_created,
  (SELECT MIN(snapshot_date) FROM nav_history) as first_snapshot,
  (SELECT MAX(snapshot_date) FROM nav_history) as last_snapshot;

-- ============================================
-- Exemples d'utilisation
-- ============================================

-- 1. Créer un snapshot manuel pour aujourd'hui
-- SELECT snapshot_nav(CURRENT_DATE);

-- 2. Créer un snapshot pour une date spécifique
-- SELECT snapshot_nav('2025-03-31');

-- 3. Générer snapshots mensuels depuis mars
-- SELECT * FROM generate_monthly_nav_snapshots('2025-03-01', CURRENT_DATE);

-- 4. Voir l'historique avec variations
-- SELECT * FROM v_nav_history_with_changes;

-- 5. Voir le résumé NAV actuel vs historique
-- SELECT * FROM v_nav_summary;

-- 6. Obtenir le NAV à une date donnée
-- SELECT * FROM get_nav_at_date('2025-03-31');

-- 7. Voir la progression NAV par mois
-- SELECT
--   snapshot_date,
--   nav_per_share,
--   period_change_pct,
--   total_change_pct
-- FROM v_nav_history_with_changes
-- ORDER BY snapshot_date;
