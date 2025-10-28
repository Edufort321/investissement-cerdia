-- ==========================================
-- MIGRATION 83: NETTOYER LES DOUBLONS DE PARTS
-- Supprime les enregistrements dupliqués dans investor_investments
-- ==========================================

-- PROBLÈME:
-- L'onglet Administration montre 17,597.34 parts
-- Mais le montant total investi est seulement 10,259.56 $
-- Si le prix de la part est 1$, on devrait avoir 10,259.56 parts
-- Il y a donc des doublons créés par erreur

-- SOLUTION:
-- 1. Afficher les doublons pour vérification
-- 2. Supprimer les doublons (garder seulement le plus ancien)
-- 3. Vérifier que le total correspond

-- ==========================================
-- 1. AFFICHER LES DOUBLONS
-- ==========================================

DO $$
DECLARE
  v_duplicate RECORD;
  v_total_duplicates INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🔍 RECHERCHE DES DOUBLONS DANS investor_investments';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Chercher les doublons (même investisseur, même date, même montant)
  FOR v_duplicate IN
    SELECT
      i.first_name,
      i.last_name,
      ii.investment_date,
      ii.amount_invested,
      ii.number_of_shares,
      COUNT(*) as nb_copies,
      STRING_AGG(ii.id::text, ', ' ORDER BY ii.created_at) as duplicate_ids
    FROM investor_investments ii
    JOIN investors i ON ii.investor_id = i.id
    GROUP BY i.first_name, i.last_name, ii.investor_id, ii.investment_date, ii.amount_invested, ii.number_of_shares
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE '⚠️  DOUBLON TROUVÉ:';
    RAISE NOTICE '  Investisseur: % %', v_duplicate.first_name, v_duplicate.last_name;
    RAISE NOTICE '  Date: %', v_duplicate.investment_date;
    RAISE NOTICE '  Montant: % $', v_duplicate.amount_invested;
    RAISE NOTICE '  Parts: %', v_duplicate.number_of_shares;
    RAISE NOTICE '  Nombre de copies: %', v_duplicate.nb_copies;
    RAISE NOTICE '  IDs: %', v_duplicate.duplicate_ids;
    RAISE NOTICE '';
    v_total_duplicates := v_total_duplicates + v_duplicate.nb_copies - 1;
  END LOOP;

  IF v_total_duplicates = 0 THEN
    RAISE NOTICE '✅ Aucun doublon trouvé!';
  ELSE
    RAISE NOTICE '📊 TOTAL: % enregistrement(s) en doublon à supprimer', v_total_duplicates;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- 2. SUPPRIMER LES DOUBLONS
-- ==========================================

DO $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  RAISE NOTICE '🗑️  SUPPRESSION DES DOUBLONS...';
  RAISE NOTICE '';

  -- Supprimer les doublons en gardant seulement le plus ancien (MIN(id))
  WITH duplicates AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY investor_id, investment_date, amount_invested, number_of_shares
        ORDER BY created_at ASC, id ASC
      ) as row_num
    FROM investor_investments
  )
  DELETE FROM investor_investments
  WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
  );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE NOTICE '✅ Aucun doublon à supprimer';
  ELSE
    RAISE NOTICE '✅ % enregistrement(s) supprimé(s)', v_deleted;
  END IF;

  RAISE NOTICE '';
END $$;

-- ==========================================
-- 3. RECALCULER investors.total_shares
-- ==========================================

DO $$
DECLARE
  v_investor RECORD;
BEGIN
  RAISE NOTICE '🔄 RECALCUL DES PARTS POUR TOUS LES INVESTISSEURS...';
  RAISE NOTICE '';

  FOR v_investor IN
    SELECT
      i.id,
      i.first_name,
      i.last_name,
      COALESCE(SUM(ii.number_of_shares), 0) as new_total_shares,
      COALESCE(SUM(ii.amount_invested), 0) as new_total_invested
    FROM investors i
    LEFT JOIN investor_investments ii ON i.id = ii.investor_id
    GROUP BY i.id, i.first_name, i.last_name
  LOOP
    UPDATE investors
    SET
      total_shares = v_investor.new_total_shares,
      total_invested = v_investor.new_total_invested,
      updated_at = NOW()
    WHERE id = v_investor.id;

    IF v_investor.new_total_shares > 0 THEN
      RAISE NOTICE '  ✅ % %: % parts (% $ investi)',
        v_investor.first_name,
        v_investor.last_name,
        v_investor.new_total_shares,
        v_investor.new_total_invested;
    END IF;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ==========================================
-- 4. VÉRIFICATION FINALE
-- ==========================================

DO $$
DECLARE
  v_total_invested DECIMAL(15, 2);
  v_total_shares DECIMAL(15, 4);
  v_expected_shares DECIMAL(15, 4);
  v_share_price DECIMAL(10, 4);
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Prix de la part
  SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
  IF v_share_price IS NULL THEN
    v_share_price := 1.00;
  END IF;

  -- Total investi
  SELECT COALESCE(SUM(amount_invested), 0)
  INTO v_total_invested
  FROM investor_investments;

  -- Total des parts
  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO v_total_shares
  FROM investor_investments;

  -- Parts attendues (montant / prix)
  v_expected_shares := v_total_invested / v_share_price;

  RAISE NOTICE 'Prix de la part: % $', v_share_price;
  RAISE NOTICE 'Montant total investi: % $ CAD', v_total_invested;
  RAISE NOTICE 'Parts totales: %', v_total_shares;
  RAISE NOTICE 'Parts attendues: %', v_expected_shares;
  RAISE NOTICE '';

  IF ABS(v_total_shares - v_expected_shares) < 0.01 THEN
    RAISE NOTICE '✅ SUCCÈS: Les parts correspondent au montant investi!';
    RAISE NOTICE '   Dashboard devrait maintenant afficher: % parts', v_total_shares;
  ELSE
    RAISE WARNING '⚠️  ATTENTION: Différence détectée!';
    RAISE WARNING '   Écart: % parts', ABS(v_total_shares - v_expected_shares);
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 83 TERMINÉE' as status,
  'Doublons supprimés et parts recalculées' as message;
