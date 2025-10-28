-- ==========================================
-- MIGRATION 89: CORRIGER LA CRÉATION EN DOUBLE DES PARTS
-- ==========================================

-- PROBLÈME:
-- Quand une transaction d'investissement est créée:
-- 1. Le trigger auto_create_investor_shares_from_transactions (migration 77) crée un enregistrement
-- 2. Le code frontend crée AUSSI un enregistrement
-- RÉSULTAT: x2 parts pour chaque investissement!

-- SOLUTION:
-- Modifier le trigger pour vérifier si l'enregistrement existe déjà AVANT d'insérer

-- ==========================================
-- 1. CORRIGER LE TRIGGER D'INSERT (Migration 77)
-- ==========================================

CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_id UUID;
BEGIN
  -- Seulement pour les transactions de type 'investissement' avec investisseur
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- VÉRIFIER D'ABORD si ça existe déjà (NOUVEAU - évite les doublons!)
    SELECT id INTO v_existing_id
    FROM investor_investments
    WHERE investor_id = NEW.investor_id
      AND investment_date::date = NEW.date::date
      AND amount_invested = NEW.amount
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE NOTICE '⚠️ Parts déjà existantes pour cette transaction, skip création automatique';
      RETURN NEW;
    END IF;

    -- Récupérer le prix de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    -- Valeur par défaut si pas de settings
    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    -- Calculer le nombre de parts
    v_number_of_shares := NEW.amount / v_share_price;

    -- Insérer dans investor_investments SEULEMENT si ça n'existe pas
    INSERT INTO investor_investments (
      investor_id,
      investment_date,
      amount_invested,
      share_price_at_purchase,
      number_of_shares,
      payment_method,
      notes
    ) VALUES (
      NEW.investor_id,
      NEW.date,
      NEW.amount,
      v_share_price,
      v_number_of_shares,
      COALESCE(NEW.payment_method, 'virement'),
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
    );

    RAISE NOTICE '✅ Parts créées automatiquement: % parts pour investisseur % (montant: % CAD)',
      v_number_of_shares, NEW.investor_id, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_investor_shares_from_transactions IS
  'Crée automatiquement les parts pour les transactions d''investissement (AVEC VÉRIFICATION DOUBLON)';

-- ==========================================
-- 2. CORRIGER LE TRIGGER D'UPDATE (Migration 79)
-- ==========================================

CREATE OR REPLACE FUNCTION handle_transaction_investment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_count INT;
BEGIN
  -- CAS 1: Transaction devient un investissement
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL
     AND (OLD.type != 'investissement' OR OLD.investor_id IS NULL OR OLD.investor_id != NEW.investor_id) THEN

    -- VÉRIFIER si ça existe déjà
    SELECT COUNT(*) INTO v_existing_count
    FROM investor_investments
    WHERE investor_id = NEW.investor_id
      AND investment_date::date = NEW.date::date
      AND amount_invested = NEW.amount;

    IF v_existing_count > 0 THEN
      RAISE NOTICE '⚠️ Parts déjà existantes pour cette transaction modifiée, skip';
      RETURN NEW;
    END IF;

    -- Récupérer le prix de la part
    SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Insérer le nouvel enregistrement
    INSERT INTO investor_investments (
      investor_id,
      investment_date,
      amount_invested,
      share_price_at_purchase,
      number_of_shares,
      payment_method,
      notes
    ) VALUES (
      NEW.investor_id,
      NEW.date,
      NEW.amount,
      v_share_price,
      v_number_of_shares,
      COALESCE(NEW.payment_method, 'virement'),
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description, ' (modifiée)')
    );

    RAISE NOTICE '✅ Parts créées suite à modification: % parts', v_number_of_shares;

  -- CAS 2: Transaction investissement modifiée (montant/date/investisseur change)
  ELSIF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL
        AND OLD.type = 'investissement' AND OLD.investor_id IS NOT NULL
        AND (OLD.amount != NEW.amount OR OLD.date != NEW.date OR OLD.investor_id != NEW.investor_id) THEN

    -- Récupérer le prix
    SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Mettre à jour l'enregistrement existant
    UPDATE investor_investments
    SET
      investor_id = NEW.investor_id,
      investment_date = NEW.date,
      amount_invested = NEW.amount,
      number_of_shares = v_number_of_shares,
      notes = CONCAT('Transaction #', NEW.id, ' - ', NEW.description, ' (modifiée)'),
      updated_at = NOW()
    WHERE investor_id = OLD.investor_id
      AND investment_date::date = OLD.date::date
      AND amount_invested = OLD.amount;

    IF NOT FOUND THEN
      -- Si pas trouvé, créer un nouveau (mais vérifier d'abord!)
      SELECT COUNT(*) INTO v_existing_count
      FROM investor_investments
      WHERE investor_id = NEW.investor_id
        AND investment_date::date = NEW.date::date
        AND amount_invested = NEW.amount;

      IF v_existing_count = 0 THEN
        INSERT INTO investor_investments (
          investor_id,
          investment_date,
          amount_invested,
          share_price_at_purchase,
          number_of_shares,
          payment_method,
          notes
        ) VALUES (
          NEW.investor_id,
          NEW.date,
          NEW.amount,
          v_share_price,
          v_number_of_shares,
          COALESCE(NEW.payment_method, 'virement'),
          CONCAT('Transaction #', NEW.id, ' - ', NEW.description, ' (créée lors MAJ)')
        );
      END IF;
    END IF;

    RAISE NOTICE '✅ Parts mises à jour: % parts', v_number_of_shares;

  -- CAS 3: Transaction n'est plus un investissement
  ELSIF OLD.type = 'investissement' AND OLD.investor_id IS NOT NULL
        AND (NEW.type != 'investissement' OR NEW.investor_id IS NULL) THEN

    -- Supprimer l'enregistrement
    DELETE FROM investor_investments
    WHERE investor_id = OLD.investor_id
      AND investment_date::date = OLD.date::date
      AND amount_invested = OLD.amount;

    RAISE NOTICE '🗑️ Parts supprimées (transaction n''est plus un investissement)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION handle_transaction_investment_change IS
  'Gère les changements de transactions investissement (AVEC VÉRIFICATION DOUBLON)';

-- ==========================================
-- 3. MESSAGE DE SUCCÈS
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 89 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Triggers corrigés:';
  RAISE NOTICE '  • auto_create_investor_shares_from_transactions';
  RAISE NOTICE '  • handle_transaction_investment_change';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Maintenant les triggers vérifient AVANT d''insérer';
  RAISE NOTICE '   → Plus de doublons lors de la création/modification';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Exécutez ensuite la Migration 83 pour';
  RAISE NOTICE '   nettoyer les doublons EXISTANTS!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 89 TERMINÉE' as status,
  'Triggers corrigés - Plus de création en double des parts' as message;
