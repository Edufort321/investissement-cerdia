-- ==========================================
-- MIGRATION 80: RECALCULER LES PARTS POUR TRANSACTIONS EXISTANTES
-- Crée les parts rétroactivement pour toutes les transactions d'investissement
-- ==========================================

-- Problème:
-- Les migrations 77 et 79 créent des triggers pour les NOUVELLES transactions,
-- mais ne recalculent PAS les parts pour les transactions EXISTANTES.
-- Résultat: total_shares = 0 même si des transactions d'investissement existent.

-- Solution:
-- Parcourir toutes les transactions de type 'investissement' existantes
-- et créer les parts correspondantes dans investor_investments

DO $$
DECLARE
  v_transaction RECORD;
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_count INTEGER := 0;
BEGIN
  -- Récupérer le prix nominal de la part
  SELECT nominal_share_value INTO v_share_price
  FROM share_settings
  LIMIT 1;

  -- Valeur par défaut si pas de settings
  IF v_share_price IS NULL OR v_share_price = 0 THEN
    v_share_price := 1.00;
    RAISE NOTICE 'Prix de la part par défaut: 1.00 $';
  ELSE
    RAISE NOTICE 'Prix de la part depuis share_settings: % $', v_share_price;
  END IF;

  -- Pour chaque transaction d'investissement existante
  FOR v_transaction IN
    SELECT * FROM transactions
    WHERE type = 'investissement'
      AND investor_id IS NOT NULL
    ORDER BY date ASC
  LOOP
    -- Calculer le nombre de parts
    v_number_of_shares := v_transaction.amount / v_share_price;

    -- Vérifier si les parts existent déjà
    IF NOT EXISTS (
      SELECT 1 FROM investor_investments
      WHERE investor_id = v_transaction.investor_id
        AND investment_date = v_transaction.date
        AND amount_invested = v_transaction.amount
    ) THEN
      -- Insérer dans investor_investments
      INSERT INTO investor_investments (
        investor_id,
        investment_date,
        amount_invested,
        share_price_at_purchase,
        number_of_shares,
        currency,
        payment_method,
        reference_number,
        notes
      ) VALUES (
        v_transaction.investor_id,
        v_transaction.date,
        v_transaction.amount,
        v_share_price,
        v_number_of_shares,
        COALESCE(v_transaction.source_currency, 'CAD'),
        v_transaction.payment_method,
        v_transaction.reference_number,
        CONCAT('Transaction #', v_transaction.id, ' - ', v_transaction.description, ' (recalcul rétroactif)')
      );

      v_count := v_count + 1;
      RAISE NOTICE 'Parts créées: % parts pour investisseur % (montant: % CAD) - Transaction: %',
        v_number_of_shares, v_transaction.investor_id, v_transaction.amount, v_transaction.description;
    ELSE
      RAISE NOTICE 'Parts déjà existantes pour transaction % - ignoré', v_transaction.id;
    END IF;
  END LOOP;

  -- Afficher le résumé
  IF v_count = 0 THEN
    RAISE NOTICE '⚠️ Aucune part créée. Soit toutes les parts existent déjà, soit aucune transaction d''investissement trouvée.';
  ELSE
    RAISE NOTICE '✅ % enregistrement(s) créé(s) dans investor_investments', v_count;
  END IF;
END $$;

-- Vérification finale
DO $$
DECLARE
  v_total_investments DECIMAL(15, 2);
  v_total_shares DECIMAL(15, 4);
  v_transaction_count INTEGER;
BEGIN
  -- Compter les transactions d'investissement
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_transaction_count, v_total_investments
  FROM transactions
  WHERE type = 'investissement' AND investor_id IS NOT NULL;

  -- Compter les parts créées
  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO v_total_shares
  FROM investor_investments;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📊 RÉSUMÉ DU RECALCUL';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Transactions d''investissement: %', v_transaction_count;
  RAISE NOTICE 'Montant total investi: % $ CAD', v_total_investments;
  RAISE NOTICE 'Parts totales créées: %', v_total_shares;
  RAISE NOTICE '';

  IF v_total_shares = 0 AND v_transaction_count > 0 THEN
    RAISE WARNING '❌ PROBLÈME: Des transactions existent mais aucune part n''a été créée!';
    RAISE WARNING 'Vérifiez que les transactions ont bien un investor_id et type=''investissement''';
  ELSIF v_total_shares > 0 THEN
    RAISE NOTICE '✅ SUCCÈS: Les parts ont été créées avec succès!';
    RAISE NOTICE 'Les investisseurs devraient maintenant voir leurs parts dans le dashboard.';
  ELSE
    RAISE NOTICE 'ℹ️ Aucune transaction d''investissement trouvée. C''est normal si vous n''avez pas encore créé de transactions.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 80 TERMINÉE' as status,
  'Recalcul rétroactif des parts effectué pour toutes les transactions existantes' as message;
