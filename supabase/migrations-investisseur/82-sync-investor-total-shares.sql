-- ==========================================
-- MIGRATION 82: SYNCHRONISER investors.total_shares
-- Mettre à jour automatiquement le champ total_shares dans la table investors
-- ==========================================

-- PROBLÈME:
-- Le dashboard principal affiche 0 parts car il utilise investors.total_shares
-- Cette colonne n'est jamais mise à jour automatiquement
-- L'onglet Administration montre les bonnes valeurs car il utilise investor_summary

-- SOLUTION:
-- 1. Créer un trigger qui met à jour investors.total_shares
--    quand investor_investments change
-- 2. Recalculer rétroactivement pour tous les investisseurs

-- ==========================================
-- 1. FONCTION: METTRE À JOUR TOTAL_SHARES
-- ==========================================

CREATE OR REPLACE FUNCTION sync_investor_total_shares()
RETURNS TRIGGER AS $$
DECLARE
  v_investor_id UUID;
  v_total_shares DECIMAL(15, 4);
  v_total_invested DECIMAL(15, 2);
BEGIN
  -- Déterminer l'investisseur concerné
  IF TG_OP = 'DELETE' THEN
    v_investor_id := OLD.investor_id;
  ELSE
    v_investor_id := NEW.investor_id;
  END IF;

  -- Calculer le total des parts pour cet investisseur
  SELECT
    COALESCE(SUM(number_of_shares), 0),
    COALESCE(SUM(amount_invested), 0)
  INTO v_total_shares, v_total_invested
  FROM investor_investments
  WHERE investor_id = v_investor_id;

  -- Mettre à jour la table investors
  UPDATE investors
  SET
    total_shares = v_total_shares,
    total_invested = v_total_invested,
    updated_at = NOW()
  WHERE id = v_investor_id;

  RAISE NOTICE 'Investisseur % mis à jour: % parts, % $ investi',
    v_investor_id, v_total_shares, v_total_invested;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_investor_total_shares IS
  'Synchronise automatiquement investors.total_shares avec investor_investments';

-- ==========================================
-- 2. CRÉER LE TRIGGER
-- ==========================================

DROP TRIGGER IF EXISTS sync_investor_total_shares ON investor_investments;

CREATE TRIGGER sync_investor_total_shares
AFTER INSERT OR UPDATE OR DELETE ON investor_investments
FOR EACH ROW
EXECUTE FUNCTION sync_investor_total_shares();

COMMENT ON TRIGGER sync_investor_total_shares ON investor_investments IS
  'Met à jour investors.total_shares quand investor_investments change';

-- ==========================================
-- 3. RECALCUL RÉTROACTIF POUR TOUS LES INVESTISSEURS
-- ==========================================

DO $$
DECLARE
  v_investor RECORD;
  v_total_shares DECIMAL(15, 4);
  v_total_invested DECIMAL(15, 2);
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🔄 RECALCUL DES PARTS POUR TOUS LES INVESTISSEURS';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Pour chaque investisseur
  FOR v_investor IN
    SELECT * FROM investors ORDER BY last_name, first_name
  LOOP
    -- Calculer le total des parts depuis investor_investments
    SELECT
      COALESCE(SUM(number_of_shares), 0),
      COALESCE(SUM(amount_invested), 0)
    INTO v_total_shares, v_total_invested
    FROM investor_investments
    WHERE investor_id = v_investor.id;

    -- Mettre à jour
    UPDATE investors
    SET
      total_shares = v_total_shares,
      total_invested = v_total_invested,
      updated_at = NOW()
    WHERE id = v_investor.id;

    IF v_total_shares > 0 THEN
      RAISE NOTICE '✅ % %: % parts (% $ investi)',
        v_investor.first_name, v_investor.last_name, v_total_shares, v_total_invested;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 RÉSUMÉ';
  RAISE NOTICE '  Investisseurs avec parts: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- 4. VÉRIFICATION
-- ==========================================

DO $$
DECLARE
  v_investor RECORD;
  v_total_parts_investors DECIMAL(15, 4);
  v_total_parts_investments DECIMAL(15, 4);
BEGIN
  -- Total des parts dans investors
  SELECT COALESCE(SUM(total_shares), 0)
  INTO v_total_parts_investors
  FROM investors;

  -- Total des parts dans investor_investments
  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO v_total_parts_investments
  FROM investor_investments;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total parts (investors): %', v_total_parts_investors;
  RAISE NOTICE 'Total parts (investor_investments): %', v_total_parts_investments;
  RAISE NOTICE '';

  IF v_total_parts_investors = v_total_parts_investments THEN
    RAISE NOTICE '✅ SYNCHRONISATION RÉUSSIE ! Les deux tables correspondent.';
  ELSE
    RAISE WARNING '⚠️ ATTENTION: Les totaux ne correspondent pas!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Détail par investisseur:';
  RAISE NOTICE '';

  FOR v_investor IN
    SELECT
      i.first_name,
      i.last_name,
      i.total_shares as shares_table_investors,
      COALESCE(SUM(ii.number_of_shares), 0) as shares_investor_investments
    FROM investors i
    LEFT JOIN investor_investments ii ON i.id = ii.investor_id
    GROUP BY i.id, i.first_name, i.last_name, i.total_shares
    HAVING i.total_shares > 0 OR COALESCE(SUM(ii.number_of_shares), 0) > 0
  LOOP
    RAISE NOTICE '  % %: % parts (investors) vs % parts (investor_investments)',
      v_investor.first_name,
      v_investor.last_name,
      v_investor.shares_table_investors,
      v_investor.shares_investor_investments;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 82 TERMINÉE' as status,
  'Synchronisation investors.total_shares configurée et recalculée' as message;
