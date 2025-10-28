-- ==========================================
-- MIGRATION 87: CORRIGER LES TRANSACTIONS EXISTANTES
-- ==========================================

-- Cette migration corrige les transactions mal classées
-- AVANT: Tout était "investissement" avec montant positif
-- APRÈS: Distinction claire entrées (positif) vs sorties (négatif)

-- ==========================================
-- 1. AFFICHER L'ÉTAT ACTUEL
-- ==========================================

DO $$
DECLARE
  v_total_investissement DECIMAL(15, 2);
  v_total_with_property DECIMAL(15, 2);
  v_count_with_property INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 ANALYSE DES TRANSACTIONS EXISTANTES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Total des investissements
  SELECT COALESCE(SUM(amount), 0) INTO v_total_investissement
  FROM transactions
  WHERE type = 'investissement';

  RAISE NOTICE 'Total "investissement": % $', v_total_investissement;

  -- Transactions avec propriété (devraient être des sorties)
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_count_with_property, v_total_with_property
  FROM transactions
  WHERE type = 'investissement' AND property_id IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE 'Transactions liées à des propriétés:';
  RAISE NOTICE '  Nombre: %', v_count_with_property;
  RAISE NOTICE '  Montant total: % $ (devrait être NÉGATIF)', v_total_with_property;
  RAISE NOTICE '';
END $$;

-- ==========================================
-- 2. CORRIGER: ACHATS DE PROPRIÉTÉS
-- ==========================================

-- Les transactions avec property_id devraient être des SORTIES
-- Marquer comme 'achat_propriete' avec montant négatif

DO $$
DECLARE
  v_count INT := 0;
BEGIN
  RAISE NOTICE '💰 CORRECTION: Achats de propriétés';
  RAISE NOTICE '';

  -- Afficher ce qui sera modifié
  FOR v_rec IN (
    SELECT
      t.id,
      t.description,
      t.amount,
      p.name as property_name
    FROM transactions t
    JOIN properties p ON t.property_id = p.id
    WHERE t.type = 'investissement'
      AND t.property_id IS NOT NULL
  )
  LOOP
    RAISE NOTICE '  ⚠️  % - % $ → sera changé en -% $',
      v_rec.description,
      v_rec.amount,
      v_rec.amount;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    -- Appliquer les modifications
    UPDATE transactions
    SET
      type = 'achat_propriete',
      amount = -ABS(amount),  -- Forcer montant négatif
      updated_at = NOW()
    WHERE type = 'investissement'
      AND property_id IS NOT NULL;

    RAISE NOTICE '';
    RAISE NOTICE '✅ % transaction(s) corrigée(s) → type=''achat_propriete'', montant négatif', v_count;
  ELSE
    RAISE NOTICE '  ✓ Aucune transaction à corriger';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==========================================
-- 3. CORRIGER: FRAIS ADMINISTRATIFS
-- ==========================================

-- Les frais (avocat, fiscalité, etc.) devraient être des SORTIES
-- Identifier par mots-clés dans la description

DO $$
DECLARE
  v_count INT := 0;
BEGIN
  RAISE NOTICE '📋 CORRECTION: Frais administratifs';
  RAISE NOTICE '';

  -- Afficher ce qui sera modifié
  FOR v_rec IN (
    SELECT
      t.id,
      t.description,
      t.amount
    FROM transactions t
    WHERE t.type = 'investissement'
      AND t.property_id IS NULL
      AND (
        LOWER(t.description) LIKE '%frais%'
        OR LOWER(t.description) LIKE '%avocat%'
        OR LOWER(t.description) LIKE '%fiscalit%'
        OR LOWER(t.description) LIKE '%neq%'
        OR LOWER(t.description) LIKE '%fidéocommis%'
      )
  )
  LOOP
    RAISE NOTICE '  ⚠️  % - % $ → sera changé en -% $',
      v_rec.description,
      v_rec.amount,
      v_rec.amount;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    -- Appliquer les modifications
    UPDATE transactions
    SET
      type = 'admin',
      amount = -ABS(amount),  -- Forcer montant négatif
      updated_at = NOW()
    WHERE type = 'investissement'
      AND property_id IS NULL
      AND (
        LOWER(description) LIKE '%frais%'
        OR LOWER(description) LIKE '%avocat%'
        OR LOWER(description) LIKE '%fiscalit%'
        OR LOWER(description) LIKE '%neq%'
        OR LOWER(description) LIKE '%fidéocommis%'
      );

    RAISE NOTICE '';
    RAISE NOTICE '✅ % transaction(s) corrigée(s) → type=''admin'', montant négatif', v_count;
  ELSE
    RAISE NOTICE '  ✓ Aucune transaction à corriger';
  END IF;

  RAISE NOTICE '';
END $$;

-- ==========================================
-- 4. VÉRIFICATION FINALE
-- ==========================================

DO $$
DECLARE
  v_total_inflow DECIMAL(15, 2);
  v_total_outflow DECIMAL(15, 2);
  v_net_balance DECIMAL(15, 2);
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Calculer les flux
  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO v_total_inflow, v_total_outflow
  FROM transactions;

  v_net_balance := v_total_inflow - v_total_outflow;

  RAISE NOTICE '💰 ENTRÉES D''ARGENT:';
  FOR v_rec IN (
    SELECT
      type,
      COUNT(*) as count,
      SUM(amount) as total
    FROM transactions
    WHERE amount > 0
    GROUP BY type
    ORDER BY total DESC
  )
  LOOP
    RAISE NOTICE '  • %: % $ (% transactions)',
      v_rec.type,
      v_rec.total,
      v_rec.count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '💸 SORTIES D''ARGENT:';
  FOR v_rec IN (
    SELECT
      type,
      COUNT(*) as count,
      SUM(ABS(amount)) as total
    FROM transactions
    WHERE amount < 0
    GROUP BY type
    ORDER BY total DESC
  )
  LOOP
    RAISE NOTICE '  • %: -% $ (% transactions)',
      v_rec.type,
      v_rec.total,
      v_rec.count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 RÉSUMÉ:';
  RAISE NOTICE '  Total entrées:  % $', v_total_inflow;
  RAISE NOTICE '  Total sorties:  -% $', v_total_outflow;
  RAISE NOTICE '  Solde net:      % $', v_net_balance;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 87 TERMINÉE' as status,
  'Transactions existantes corrigées avec flux appropriés' as message;
