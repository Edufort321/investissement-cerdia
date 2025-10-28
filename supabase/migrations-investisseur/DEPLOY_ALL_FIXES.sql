-- ==========================================
-- SCRIPT DE DÉPLOIEMENT COMPLET
-- Migrations 75-82 : Correctifs complets du système
-- ==========================================
--
-- Ce script exécute toutes les migrations dans le bon ordre.
-- Copiez-collez ce fichier complet dans Supabase SQL Editor et cliquez RUN.
--
-- ⚠️ IMPORTANT: Exécutez ce script une seule fois.
-- ==========================================

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '🚀 DÉPLOIEMENT DES CORRECTIONS - CERDIA Investment Platform'
\echo '════════════════════════════════════════════════════════════════'
\echo ''
\echo '📋 Migrations à exécuter:'
\echo '  75. Ajout colonnes manquantes'
\echo '  76. Correction trigger cash_flow'
\echo '  77. Calcul automatique parts (INSERT)'
\echo '  78. Autorisation suppression transactions'
\echo '  79. Modification transactions (UPDATE)'
\echo '  80. ⭐ Recalcul rétroactif des parts (CRITIQUE)'
\echo '  81. ⭐ NAV réaliste avec appréciation 8%'
\echo '  82. ⭐ Synchronisation investors.total_shares'
\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo ''

-- ==========================================
-- MIGRATION 75: Ajout colonnes manquantes
-- ==========================================

\echo '📦 Migration 75: Ajout colonnes manquantes...'

-- Ajouter payment_schedule_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'payment_schedule_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN payment_schedule_id UUID REFERENCES payment_schedules(id);
        RAISE NOTICE '✅ Colonne payment_schedule_id ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne payment_schedule_id existe déjà';
    END IF;
END $$;

-- Ajouter source_currency si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'source_currency'
    ) THEN
        ALTER TABLE transactions ADD COLUMN source_currency VARCHAR(3) DEFAULT 'CAD';
        RAISE NOTICE '✅ Colonne source_currency ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne source_currency existe déjà';
    END IF;
END $$;

-- Ajouter source_amount si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'source_amount'
    ) THEN
        ALTER TABLE transactions ADD COLUMN source_amount DECIMAL(15, 2);
        RAISE NOTICE '✅ Colonne source_amount ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne source_amount existe déjà';
    END IF;
END $$;

\echo '✅ Migration 75 terminée'
\echo ''

-- ==========================================
-- MIGRATION 76: Correction trigger cash_flow
-- ==========================================

\echo '🔧 Migration 76: Correction trigger cash_flow...'

CREATE OR REPLACE FUNCTION create_actual_cash_flow()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IN ('investissement', 'capex', 'maintenance', 'admin') THEN
    INSERT INTO cash_flow_forecast (
      transaction_date,
      amount,
      category,
      description,
      actual_transaction_id,
      is_actual
    ) VALUES (
      NEW.date,
      NEW.amount,
      NEW.type,
      NEW.description,
      NEW.id,
      TRUE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_actual_cash_flow ON transactions;

CREATE TRIGGER create_actual_cash_flow
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION create_actual_cash_flow();

\echo '✅ Migration 76 terminée'
\echo ''

-- ==========================================
-- MIGRATION 77: Calcul automatique parts (INSERT)
-- ==========================================

\echo '📊 Migration 77: Calcul automatique parts (INSERT)...'

CREATE OR REPLACE FUNCTION auto_create_investor_shares()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
BEGIN
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    v_number_of_shares := NEW.amount / v_share_price;

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
      NEW.investor_id,
      NEW.date,
      NEW.amount,
      v_share_price,
      v_number_of_shares,
      COALESCE(NEW.source_currency, 'CAD'),
      NEW.payment_method,
      NEW.reference_number,
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
    );

    RAISE NOTICE 'Parts créées: % parts pour investisseur % (montant: % CAD)',
      v_number_of_shares, NEW.investor_id, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_investor_shares ON transactions;

CREATE TRIGGER auto_create_investor_shares
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_investor_shares();

\echo '✅ Migration 77 terminée'
\echo ''

-- ==========================================
-- MIGRATION 78: Autorisation suppression transactions
-- ==========================================

\echo '🗑️  Migration 78: Autorisation suppression transactions...'

-- Modifier les contraintes pour ON DELETE SET NULL
ALTER TABLE cash_flow_forecast
DROP CONSTRAINT IF EXISTS cash_flow_forecast_actual_transaction_id_fkey;

ALTER TABLE cash_flow_forecast
ADD CONSTRAINT cash_flow_forecast_actual_transaction_id_fkey
FOREIGN KEY (actual_transaction_id)
REFERENCES transactions(id)
ON DELETE SET NULL;

ALTER TABLE bank_transactions
DROP CONSTRAINT IF EXISTS bank_transactions_matched_transaction_id_fkey;

ALTER TABLE bank_transactions
ADD CONSTRAINT bank_transactions_matched_transaction_id_fkey
FOREIGN KEY (matched_transaction_id)
REFERENCES transactions(id)
ON DELETE SET NULL;

ALTER TABLE payment_obligations
DROP CONSTRAINT IF EXISTS payment_obligations_paid_transaction_id_fkey;

ALTER TABLE payment_obligations
ADD CONSTRAINT payment_obligations_paid_transaction_id_fkey
FOREIGN KEY (paid_transaction_id)
REFERENCES transactions(id)
ON DELETE SET NULL;

-- Trigger pour supprimer les parts quand transaction est supprimée
CREATE OR REPLACE FUNCTION auto_delete_investor_shares_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'investissement' AND OLD.investor_id IS NOT NULL THEN
    DELETE FROM investor_investments
    WHERE investor_id = OLD.investor_id
      AND investment_date = OLD.date
      AND amount_invested = OLD.amount;

    RAISE NOTICE 'Parts supprimées pour investisseur % (transaction du %)',
      OLD.investor_id, OLD.date;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_delete_investor_shares_on_transaction_delete ON transactions;

CREATE TRIGGER auto_delete_investor_shares_on_transaction_delete
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_delete_investor_shares_on_transaction_delete();

\echo '✅ Migration 78 terminée'
\echo ''

-- ==========================================
-- MIGRATION 79: Modification transactions (UPDATE)
-- ==========================================

\echo '✏️  Migration 79: Modification transactions (UPDATE)...'

CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
BEGIN
  -- CAS 1: Transaction investissement → autre type
  IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
    DELETE FROM investor_investments
    WHERE investor_id = OLD.investor_id
      AND investment_date = OLD.date
      AND amount_invested = OLD.amount;

    RAISE NOTICE 'Parts supprimées (transaction n''est plus un investissement)';
  END IF;

  -- CAS 2 & 3: Transaction devient ou reste investissement
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Supprimer l'ancien enregistrement si les clés changent
    IF OLD.type = 'investissement' THEN
      DELETE FROM investor_investments
      WHERE investor_id = OLD.investor_id
        AND investment_date = OLD.date
        AND amount_invested = OLD.amount;
    END IF;

    -- Créer le nouvel enregistrement
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
      NEW.investor_id,
      NEW.date,
      NEW.amount,
      v_share_price,
      v_number_of_shares,
      COALESCE(NEW.source_currency, 'CAD'),
      NEW.payment_method,
      NEW.reference_number,
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description, ' (modifié)')
    );

    RAISE NOTICE 'Parts mises à jour: % parts pour investisseur %',
      v_number_of_shares, NEW.investor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_investor_shares_on_transaction_update ON transactions;

CREATE TRIGGER auto_update_investor_shares_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_update_investor_shares_on_transaction_update();

\echo '✅ Migration 79 terminée'
\echo ''

-- ==========================================
-- MIGRATION 80: ⭐ RECALCUL RÉTROACTIF DES PARTS
-- ==========================================

\echo '🔄 Migration 80: Recalcul rétroactif des parts...'
\echo ''

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
    v_number_of_shares := v_transaction.amount / v_share_price;

    -- Vérifier si les parts existent déjà
    IF NOT EXISTS (
      SELECT 1 FROM investor_investments
      WHERE investor_id = v_transaction.investor_id
        AND investment_date = v_transaction.date
        AND amount_invested = v_transaction.amount
    ) THEN
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
      RAISE NOTICE '  ✅ Parts créées: % parts (montant: % CAD) - %',
        v_number_of_shares, v_transaction.amount, v_transaction.description;
    ELSE
      RAISE NOTICE '  ℹ️  Parts déjà existantes - ignoré';
    END IF;
  END LOOP;

  IF v_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Aucune part créée. Soit toutes existent déjà, soit aucune transaction trouvée.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ % enregistrement(s) créé(s) dans investor_investments', v_count;
  END IF;
END $$;

\echo ''
\echo '✅ Migration 80 terminée'
\echo ''

-- ==========================================
-- MIGRATION 81: ⭐ NAV RÉALISTE AVEC APPRÉCIATION 8%
-- ==========================================

\echo '📈 Migration 81: NAV réaliste avec appréciation 8%...'
\echo ''

-- 1. Trigger: Créer évaluation initiale à l'achat
CREATE OR REPLACE FUNCTION auto_create_initial_valuation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'acquired' AND (OLD.status IS NULL OR OLD.status != 'acquired') THEN
    IF NOT EXISTS (
      SELECT 1 FROM property_valuations
      WHERE property_id = NEW.id
        AND valuation_type = 'initial'
    ) THEN
      INSERT INTO property_valuations (
        property_id,
        valuation_date,
        valuation_amount,
        valuation_type,
        valuation_method,
        appraiser_name,
        notes,
        currency
      ) VALUES (
        NEW.id,
        COALESCE(NEW.reservation_date, NEW.completion_date, CURRENT_DATE),
        NEW.total_cost,
        'initial',
        'purchase_price',
        'Système automatique',
        CONCAT('Évaluation initiale automatique au moment de l''achat - Propriété: ', NEW.name),
        'USD'
      );

      RAISE NOTICE '  ✅ Évaluation initiale créée pour propriété %: % USD',
        NEW.name, NEW.total_cost;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_initial_valuation ON properties;

CREATE TRIGGER auto_create_initial_valuation
AFTER INSERT OR UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION auto_create_initial_valuation();

-- 2. Fonction: Calculer valeur avec appréciation
CREATE OR REPLACE FUNCTION calculate_property_value_with_appreciation(
  p_property_id UUID,
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_initial_valuation RECORD;
  v_years_elapsed DECIMAL(10, 4);
  v_appreciation_rate DECIMAL(5, 4) := 0.08;
  v_current_value DECIMAL(15, 2);
BEGIN
  SELECT *
  INTO v_initial_valuation
  FROM property_valuations
  WHERE property_id = p_property_id
    AND valuation_type = 'initial'
  ORDER BY valuation_date ASC
  LIMIT 1;

  IF v_initial_valuation IS NULL THEN
    RETURN 0;
  END IF;

  v_years_elapsed := EXTRACT(EPOCH FROM (p_target_date - v_initial_valuation.valuation_date)) / (365.25 * 24 * 3600);

  IF v_years_elapsed < 0 THEN
    RETURN v_initial_valuation.valuation_amount;
  END IF;

  v_current_value := v_initial_valuation.valuation_amount * POWER(1 + v_appreciation_rate, v_years_elapsed);

  RETURN v_current_value;
END;
$$ LANGUAGE plpgsql;

-- 3. Vue: Valeur actuelle des propriétés
CREATE OR REPLACE VIEW current_property_values AS
SELECT
  p.id as property_id,
  p.name as property_name,
  p.total_cost as acquisition_cost,
  COALESCE(p.reservation_date, p.completion_date) as acquisition_date,
  pv.valuation_amount as initial_valuation,
  pv.valuation_date as initial_valuation_date,
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE) as current_value,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(p.reservation_date, p.completion_date, pv.valuation_date))) as years_held,
  calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - pv.valuation_amount as appreciation_amount,
  CASE
    WHEN pv.valuation_amount > 0 THEN
      ((calculate_property_value_with_appreciation(p.id, CURRENT_DATE) - pv.valuation_amount) / pv.valuation_amount) * 100
    ELSE 0
  END as appreciation_percentage,
  p.status,
  p.currency
FROM properties p
LEFT JOIN property_valuations pv ON p.id = pv.property_id AND pv.valuation_type = 'initial'
WHERE p.status IN ('acquired', 'complete', 'en_location')
ORDER BY COALESCE(p.reservation_date, p.completion_date) DESC;

-- 4. Fonction: Calculer NAV réaliste
CREATE OR REPLACE FUNCTION calculate_realistic_nav(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_assets DECIMAL(15, 2),
  total_liabilities DECIMAL(15, 2),
  net_asset_value DECIMAL(15, 2),
  total_shares DECIMAL(15, 4),
  nav_per_share DECIMAL(10, 4),
  cash_balance DECIMAL(15, 2),
  properties_value DECIMAL(15, 2),
  appreciation_gain DECIMAL(15, 2)
) AS $$
DECLARE
  v_exchange_rate DECIMAL(10, 4);
  v_total_investments DECIMAL(15, 2);
  v_total_expenses DECIMAL(15, 2);
  v_properties_initial DECIMAL(15, 2);
  v_properties_current DECIMAL(15, 2);
BEGIN
  SELECT get_current_exchange_rate('USD', 'CAD') INTO v_exchange_rate;
  IF v_exchange_rate IS NULL THEN
    v_exchange_rate := 1.40;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_investments
  FROM transactions
  WHERE type = 'investissement';

  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_total_expenses
  FROM transactions
  WHERE type IN ('capex', 'maintenance', 'admin')
     OR (type = 'investissement' AND property_id IS NOT NULL);

  SELECT COALESCE(SUM(valuation_amount * v_exchange_rate), 0)
  INTO v_properties_initial
  FROM property_valuations
  WHERE valuation_type = 'initial';

  SELECT COALESCE(SUM(current_value * v_exchange_rate), 0)
  INTO v_properties_current
  FROM current_property_values;

  cash_balance := v_total_investments - v_total_expenses;
  total_assets := cash_balance + v_properties_current;
  total_liabilities := 0;
  net_asset_value := total_assets - total_liabilities;

  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO total_shares
  FROM investor_investments;

  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.00;
  END IF;

  appreciation_gain := v_properties_current - v_properties_initial;
  properties_value := v_properties_current;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 5. Vue: NAV actuel réaliste
CREATE OR REPLACE VIEW realistic_nav_current AS
SELECT
  (SELECT * FROM calculate_realistic_nav(CURRENT_DATE)).*;

\echo ''
\echo '✅ Migration 81 terminée'
\echo ''

-- ==========================================
-- MIGRATION 82: ⭐ SYNCHRONISATION investors.total_shares
-- ==========================================

\echo '🔄 Migration 82: Synchronisation investors.total_shares...'
\echo ''

-- 1. Fonction: Mettre à jour total_shares
CREATE OR REPLACE FUNCTION sync_investor_total_shares()
RETURNS TRIGGER AS $$
DECLARE
  v_investor_id UUID;
  v_total_shares DECIMAL(15, 4);
  v_total_invested DECIMAL(15, 2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_investor_id := OLD.investor_id;
  ELSE
    v_investor_id := NEW.investor_id;
  END IF;

  SELECT
    COALESCE(SUM(number_of_shares), 0),
    COALESCE(SUM(amount_invested), 0)
  INTO v_total_shares, v_total_invested
  FROM investor_investments
  WHERE investor_id = v_investor_id;

  UPDATE investors
  SET
    total_shares = v_total_shares,
    total_invested = v_total_invested,
    updated_at = NOW()
  WHERE id = v_investor_id;

  RAISE NOTICE '  ✅ Investisseur mis à jour: % parts, % $ investi',
    v_total_shares, v_total_invested;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_investor_total_shares ON investor_investments;

CREATE TRIGGER sync_investor_total_shares
AFTER INSERT OR UPDATE OR DELETE ON investor_investments
FOR EACH ROW
EXECUTE FUNCTION sync_investor_total_shares();

-- 2. Recalcul rétroactif pour tous les investisseurs
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

  FOR v_investor IN
    SELECT * FROM investors ORDER BY last_name, first_name
  LOOP
    SELECT
      COALESCE(SUM(number_of_shares), 0),
      COALESCE(SUM(amount_invested), 0)
    INTO v_total_shares, v_total_invested
    FROM investor_investments
    WHERE investor_id = v_investor.id;

    UPDATE investors
    SET
      total_shares = v_total_shares,
      total_invested = v_total_invested,
      updated_at = NOW()
    WHERE id = v_investor.id;

    IF v_total_shares > 0 THEN
      RAISE NOTICE '  ✅ % %: % parts (% $ investi)',
        v_investor.first_name, v_investor.last_name, v_total_shares, v_total_invested;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 RÉSUMÉ: % investisseur(s) avec parts', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

\echo ''
\echo '✅ Migration 82 terminée'
\echo ''

-- ==========================================
-- VÉRIFICATION FINALE
-- ==========================================

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '✅ VÉRIFICATION FINALE'
\echo '════════════════════════════════════════════════════════════════'
\echo ''

DO $$
DECLARE
  v_total_parts_investors DECIMAL(15, 4);
  v_total_parts_investments DECIMAL(15, 4);
  v_nav RECORD;
  v_investor RECORD;
BEGIN
  -- Vérification synchronisation
  SELECT COALESCE(SUM(total_shares), 0)
  INTO v_total_parts_investors
  FROM investors;

  SELECT COALESCE(SUM(number_of_shares), 0)
  INTO v_total_parts_investments
  FROM investor_investments;

  RAISE NOTICE '📊 SYNCHRONISATION DES PARTS';
  RAISE NOTICE '  Total parts (investors): %', v_total_parts_investors;
  RAISE NOTICE '  Total parts (investor_investments): %', v_total_parts_investments;
  RAISE NOTICE '';

  IF v_total_parts_investors = v_total_parts_investments THEN
    RAISE NOTICE '✅ SYNCHRONISATION RÉUSSIE ! Les deux tables correspondent.';
  ELSE
    RAISE WARNING '⚠️  ATTENTION: Les totaux ne correspondent pas!';
    RAISE WARNING '  Différence: %', ABS(v_total_parts_investors - v_total_parts_investments);
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '────────────────────────────────────────────────────────────';
  RAISE NOTICE '';

  -- Test NAV
  SELECT * INTO v_nav
  FROM calculate_realistic_nav(CURRENT_DATE);

  RAISE NOTICE '📈 CALCUL NAV RÉALISTE';
  RAISE NOTICE '  Actifs totaux: % $ CAD', v_nav.total_assets;
  RAISE NOTICE '    - Liquidités: % $ CAD', v_nav.cash_balance;
  RAISE NOTICE '    - Propriétés: % $ CAD', v_nav.properties_value;
  RAISE NOTICE '    - Gain appréciation: % $ CAD', v_nav.appreciation_gain;
  RAISE NOTICE '';
  RAISE NOTICE '  Passifs: % $ CAD', v_nav.total_liabilities;
  RAISE NOTICE '  NAV: % $ CAD', v_nav.net_asset_value;
  RAISE NOTICE '';
  RAISE NOTICE '  Parts totales: %', v_nav.total_shares;
  RAISE NOTICE '  NAV par part: % $ CAD', v_nav.nav_per_share;
  RAISE NOTICE '';

  RAISE NOTICE '────────────────────────────────────────────────────────────';
  RAISE NOTICE '';
  RAISE NOTICE '👥 DÉTAIL PAR INVESTISSEUR';
  RAISE NOTICE '';

  FOR v_investor IN
    SELECT
      i.first_name,
      i.last_name,
      i.total_shares as shares_in_investors,
      COALESCE(SUM(ii.number_of_shares), 0) as shares_in_investments
    FROM investors i
    LEFT JOIN investor_investments ii ON i.id = ii.investor_id
    GROUP BY i.id, i.first_name, i.last_name, i.total_shares
    HAVING i.total_shares > 0 OR COALESCE(SUM(ii.number_of_shares), 0) > 0
  LOOP
    RAISE NOTICE '  % %: % parts',
      v_investor.first_name,
      v_investor.last_name,
      v_investor.shares_in_investors;
  END LOOP;

  RAISE NOTICE '';
END $$;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !'
\echo '════════════════════════════════════════════════════════════════'
\echo ''
\echo '📋 Ce qui a été fait:'
\echo '  ✅ Colonnes manquantes ajoutées'
\echo '  ✅ Triggers de calcul configurés (INSERT, UPDATE, DELETE)'
\echo '  ✅ Contraintes de suppression corrigées'
\echo '  ✅ Parts recalculées rétroactivement'
\echo '  ✅ NAV réaliste avec appréciation 8% configuré'
\echo '  ✅ Synchronisation investors.total_shares activée'
\echo ''
\echo '🔄 Prochaines étapes:'
\echo '  1. Rafraîchir votre dashboard'
\echo '  2. Vérifier que les parts s''affichent correctement'
\echo '  3. Vérifier le NAV calculé'
\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo ''
