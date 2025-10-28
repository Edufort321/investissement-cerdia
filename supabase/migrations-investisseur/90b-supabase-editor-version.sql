-- =====================================================
-- MIGRATION 90B: VERSION POUR ÉDITEUR SQL SUPABASE
-- Date: 2025-01-28
-- Description: Correction complète du système de transactions
--              + Ajout gestion des dettes investisseurs
--              Version compatible éditeur SQL Supabase (sans \echo)
-- =====================================================

-- =====================================================
-- PARTIE 1: AJOUT DE CHAMPS À LA TABLE TRANSACTIONS
-- =====================================================

-- Ajout champ pour identifier la source du paiement
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'compte_courant'
CHECK (payment_source IN ('compte_courant', 'investisseur_direct'));

-- Si payment_source = 'investisseur_direct', préciser le type
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS investor_payment_type TEXT
CHECK (investor_payment_type IN ('achat_parts', 'dette_a_rembourser'));

-- Indique si c'est un impact au compte courant
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS affects_compte_courant BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN transactions.payment_source IS
'Source du paiement: compte_courant (société paie) ou investisseur_direct (investisseur paie lui-même)';

COMMENT ON COLUMN transactions.investor_payment_type IS
'Si investisseur_direct: achat_parts (achat direct de parts) ou dette_a_rembourser (créer une dette)';

COMMENT ON COLUMN transactions.affects_compte_courant IS
'TRUE = affecte le compte courant (défaut), FALSE = n''affecte pas le compte courant';

-- =====================================================
-- PARTIE 2: TABLE INVESTOR_DEBTS
-- =====================================================

CREATE TABLE IF NOT EXISTS investor_debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Montant et devise
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'CAD',

  -- Description
  description TEXT NOT NULL,
  notes TEXT,

  -- Statut
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'partial', 'paid')),

  -- Paiements
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  amount_remaining DECIMAL(15, 2) GENERATED ALWAYS AS (amount - amount_paid) STORED,

  -- Dates
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte: amount_paid ne peut pas dépasser amount
  CHECK (amount_paid <= amount)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_investor_debts_investor_id ON investor_debts(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_debts_status ON investor_debts(status);
CREATE INDEX IF NOT EXISTS idx_investor_debts_transaction_id ON investor_debts(transaction_id);

COMMENT ON TABLE investor_debts IS
'Stocke les dettes des investisseurs envers la société';

-- =====================================================
-- PARTIE 3: VUE RÉCAPITULATIVE DETTES PAR INVESTISSEUR
-- =====================================================

CREATE OR REPLACE VIEW investor_debts_summary AS
SELECT
  i.id AS investor_id,
  i.first_name || ' ' || i.last_name AS investor_name,
  COUNT(d.id) AS total_debts,
  COUNT(CASE WHEN d.status = 'active' THEN 1 END) AS active_debts,
  COALESCE(SUM(CASE WHEN d.status = 'active' THEN d.amount_remaining END), 0) AS total_amount_due,
  COALESCE(SUM(d.amount), 0) AS total_debt_created,
  COALESCE(SUM(d.amount_paid), 0) AS total_debt_paid
FROM investors i
LEFT JOIN investor_debts d ON i.id = d.investor_id
GROUP BY i.id, i.first_name, i.last_name;

COMMENT ON VIEW investor_debts_summary IS
'Vue récapitulative des dettes par investisseur';

-- =====================================================
-- PARTIE 4: FONCTION DE RECALCUL DES TOTAUX INVESTISSEUR
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_investor_totals(p_investor_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_shares DECIMAL(15, 4);
  v_total_invested DECIMAL(15, 2);
  v_total_shares_issued DECIMAL(15, 4);
  v_percentage DECIMAL(5, 2);
  v_share_value DECIMAL(15, 2);
  v_current_value DECIMAL(15, 2);
BEGIN
  -- Récupérer la valeur actuelle de la part
  SELECT share_value INTO v_share_value
  FROM investors
  WHERE id = p_investor_id;

  IF v_share_value IS NULL THEN
    v_share_value := 1.00;
  END IF;

  -- Calculer total parts depuis investor_investments
  SELECT COALESCE(SUM(shares_purchased), 0)
  INTO v_total_shares
  FROM investor_investments
  WHERE investor_id = p_investor_id
    AND status = 'active';

  -- Calculer total investi depuis investor_investments
  SELECT COALESCE(SUM(amount_invested), 0)
  INTO v_total_invested
  FROM investor_investments
  WHERE investor_id = p_investor_id
    AND status = 'active';

  -- Calculer total parts émises (tous investisseurs)
  SELECT COALESCE(SUM(shares_purchased), 0)
  INTO v_total_shares_issued
  FROM investor_investments
  WHERE status = 'active';

  -- Calculer pourcentage de propriété
  IF v_total_shares_issued > 0 THEN
    v_percentage := (v_total_shares / v_total_shares_issued) * 100;
  ELSE
    v_percentage := 0;
  END IF;

  -- Calculer valeur actuelle
  v_current_value := v_total_shares * v_share_value;

  -- Mise à jour investisseur
  UPDATE investors
  SET
    total_shares = v_total_shares,
    total_invested = v_total_invested,
    percentage_ownership = v_percentage,
    current_value = v_current_value,
    updated_at = NOW()
  WHERE id = p_investor_id;

  RAISE NOTICE 'Investisseur % recalculé: % parts, % investi, % CAD valeur actuelle, % propriété',
    p_investor_id, v_total_shares, v_total_invested, v_current_value, v_percentage;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_investor_totals IS
'Recalcule total_shares, total_invested, current_value et percentage_ownership pour un investisseur';

-- =====================================================
-- PARTIE 5: TRIGGER AUTO-CALCUL APRÈS INSERT/UPDATE/DELETE
-- =====================================================

-- Trigger après INSERT dans investor_investments
CREATE OR REPLACE FUNCTION trigger_recalculate_after_investment_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_investor_totals(NEW.investor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_recalculate_after_investment_insert ON investor_investments;
CREATE TRIGGER auto_recalculate_after_investment_insert
AFTER INSERT ON investor_investments
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_after_investment_insert();

-- Trigger après UPDATE dans investor_investments
CREATE OR REPLACE FUNCTION trigger_recalculate_after_investment_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer pour l'ancien ET le nouvel investisseur (au cas où investor_id change)
  PERFORM recalculate_investor_totals(OLD.investor_id);
  IF NEW.investor_id != OLD.investor_id THEN
    PERFORM recalculate_investor_totals(NEW.investor_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_recalculate_after_investment_update ON investor_investments;
CREATE TRIGGER auto_recalculate_after_investment_update
AFTER UPDATE ON investor_investments
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_after_investment_update();

-- Trigger après DELETE dans investor_investments
CREATE OR REPLACE FUNCTION trigger_recalculate_after_investment_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_investor_totals(OLD.investor_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_recalculate_after_investment_delete ON investor_investments;
CREATE TRIGGER auto_recalculate_after_investment_delete
AFTER DELETE ON investor_investments
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_after_investment_delete();

-- =====================================================
-- PARTIE 6: AMÉLIORATION TRIGGER CRÉATION PARTS
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_id UUID;
BEGIN
  -- Seulement pour les investissements avec investisseur
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Récupérer prix de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
      RAISE NOTICE '⚠️  Prix part non défini, utilisation valeur par défaut 1.00';
    END IF;

    -- Calculer nombre de parts
    v_number_of_shares := NEW.amount / v_share_price;

    -- ⚠️  VÉRIFICATION DOUBLON (éviter création multiple)
    SELECT id INTO v_existing_id
    FROM investor_investments
    WHERE investor_id = NEW.investor_id
      AND investment_date::date = NEW.date::date
      AND amount_invested = NEW.amount
      AND ABS(shares_purchased - v_number_of_shares) < 0.0001
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE NOTICE '⚠️  Parts déjà existantes (ID: %), skip création automatique', v_existing_id;
      RETURN NEW;
    END IF;

    -- Créer l'entrée dans investor_investments
    INSERT INTO investor_investments (
      investor_id,
      transaction_id,
      investment_date,
      amount_invested,
      shares_purchased,
      share_price_at_purchase,
      currency,
      payment_method,
      status,
      notes
    ) VALUES (
      NEW.investor_id,
      NEW.id,
      NEW.date,
      NEW.amount,
      v_number_of_shares,
      v_share_price,
      COALESCE(NEW.source_currency, 'CAD'),
      'virement',
      'active',
      'Créé automatiquement par trigger pour transaction #' || NEW.id::text
    );

    RAISE NOTICE '✅ Parts créées automatiquement: % parts pour investisseur %',
      v_number_of_shares, NEW.investor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_investor_shares_from_transactions ON transactions;
CREATE TRIGGER auto_create_investor_shares_from_transactions
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_investor_shares_from_transactions();

-- =====================================================
-- PARTIE 7: TRIGGER SUPPRESSION TRANSACTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_delete_investor_shares_on_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'investissement' AND OLD.investor_id IS NOT NULL THEN
    -- Supprimer les parts liées à cette transaction
    DELETE FROM investor_investments
    WHERE transaction_id = OLD.id;

    -- Le trigger auto-recalcul se charge de mettre à jour le total

    RAISE NOTICE '✅ Parts supprimées pour transaction % (investisseur %)',
      OLD.id, OLD.investor_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_delete_investor_shares_on_transaction_delete ON transactions;
CREATE TRIGGER auto_delete_investor_shares_on_transaction_delete
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_delete_investor_shares_on_transaction_delete();

-- =====================================================
-- PARTIE 8: TRIGGER MISE À JOUR TRANSACTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
  v_existing_investment_id UUID;
BEGIN
  -- CAS 1: Transaction investissement → autre type
  IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
    DELETE FROM investor_investments
    WHERE transaction_id = OLD.id;

    RAISE NOTICE 'Parts supprimées (transaction n''est plus un investissement)';
  END IF;

  -- CAS 2: Transaction reste ou devient investissement
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN
    -- Récupérer prix de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    v_number_of_shares := NEW.amount / v_share_price;

    -- Chercher investment existant pour cette transaction
    SELECT id INTO v_existing_investment_id
    FROM investor_investments
    WHERE transaction_id = NEW.id
    LIMIT 1;

    IF v_existing_investment_id IS NOT NULL THEN
      -- Mettre à jour
      UPDATE investor_investments
      SET
        investor_id = NEW.investor_id,
        investment_date = NEW.date,
        amount_invested = NEW.amount,
        shares_purchased = v_number_of_shares,
        share_price_at_purchase = v_share_price,
        currency = COALESCE(NEW.source_currency, 'CAD'),
        updated_at = NOW()
      WHERE id = v_existing_investment_id;

      RAISE NOTICE 'Parts mises à jour pour transaction %', NEW.id;
    ELSE
      -- Créer (au cas où)
      INSERT INTO investor_investments (
        investor_id,
        transaction_id,
        investment_date,
        amount_invested,
        shares_purchased,
        share_price_at_purchase,
        currency,
        status,
        notes
      ) VALUES (
        NEW.investor_id,
        NEW.id,
        NEW.date,
        NEW.amount,
        v_number_of_shares,
        v_share_price,
        COALESCE(NEW.source_currency, 'CAD'),
        'active',
        'Créé automatiquement lors de la mise à jour de transaction #' || NEW.id::text
      );

      RAISE NOTICE 'Parts créées lors de la mise à jour transaction %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_investor_shares_on_transaction_update ON transactions;
CREATE TRIGGER auto_update_investor_shares_on_transaction_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_update_investor_shares_on_transaction_update();

-- =====================================================
-- PARTIE 9: FONCTION CRÉATION DETTE AUTOMATIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION create_investor_debt_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Si transaction avec payment_source='investisseur_direct' et investor_payment_type='dette_a_rembourser'
  IF NEW.payment_source = 'investisseur_direct'
     AND NEW.investor_payment_type = 'dette_a_rembourser'
     AND NEW.investor_id IS NOT NULL THEN

    -- Créer la dette
    INSERT INTO investor_debts (
      investor_id,
      transaction_id,
      amount,
      currency,
      description,
      status,
      created_date
    ) VALUES (
      NEW.investor_id,
      NEW.id,
      ABS(NEW.amount),
      COALESCE(NEW.source_currency, 'CAD'),
      NEW.description || ' (Dette créée automatiquement)',
      'active',
      NEW.date
    );

    RAISE NOTICE '✅ Dette créée automatiquement pour investisseur % (montant: %)',
      NEW.investor_id, ABS(NEW.amount);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_debt_from_transaction ON transactions;
CREATE TRIGGER auto_create_debt_from_transaction
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION create_investor_debt_from_transaction();

-- =====================================================
-- PARTIE 10: TRIGGER MISE À JOUR current_value QUAND share_value CHANGE
-- =====================================================

CREATE OR REPLACE FUNCTION update_all_investors_current_value()
RETURNS TRIGGER AS $$
DECLARE
  v_investor RECORD;
BEGIN
  -- Quand share_value change dans la table investors, recalculer current_value
  -- Note: Normalement share_value est synchronisé avec share_settings.nominal_share_value

  -- Mettre à jour current_value pour TOUS les investisseurs
  UPDATE investors
  SET current_value = total_shares * share_value,
      updated_at = NOW();

  RAISE NOTICE '✅ Valeurs actuelles mises à jour pour tous les investisseurs';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur la table share_settings quand nominal_share_value change
CREATE OR REPLACE FUNCTION sync_share_value_to_investors()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand la valeur nominale change dans share_settings, mettre à jour share_value pour tous les investisseurs
  UPDATE investors
  SET share_value = NEW.nominal_share_value,
      current_value = total_shares * NEW.nominal_share_value,
      updated_at = NOW();

  RAISE NOTICE '✅ share_value synchronisé: % CAD pour tous les investisseurs', NEW.nominal_share_value;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_sync_share_value_to_investors ON share_settings;
CREATE TRIGGER auto_sync_share_value_to_investors
AFTER UPDATE OF nominal_share_value ON share_settings
FOR EACH ROW
WHEN (OLD.nominal_share_value IS DISTINCT FROM NEW.nominal_share_value)
EXECUTE FUNCTION sync_share_value_to_investors();

-- =====================================================
-- PARTIE 11: FONCTION RECALCULER TOUS LES INVESTISSEURS
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_all_investors()
RETURNS TABLE(investor_id UUID, investor_name TEXT, old_shares DECIMAL, new_shares DECIMAL, old_invested DECIMAL, new_invested DECIMAL) AS $$
DECLARE
  v_investor RECORD;
BEGIN
  FOR v_investor IN SELECT id, first_name || ' ' || last_name AS name, total_shares, total_invested FROM investors LOOP
    -- Stocker anciennes valeurs
    investor_id := v_investor.id;
    investor_name := v_investor.name;
    old_shares := v_investor.total_shares;
    old_invested := v_investor.total_invested;

    -- Recalculer
    PERFORM recalculate_investor_totals(v_investor.id);

    -- Récupérer nouvelles valeurs
    SELECT i.total_shares, i.total_invested
    INTO new_shares, new_invested
    FROM investors i
    WHERE i.id = v_investor.id;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_investors IS
'Recalcule les totaux pour TOUS les investisseurs et retourne un rapport';

-- =====================================================
-- PARTIE 12: SCRIPT DE NETTOYAGE DES DOUBLONS
-- =====================================================

CREATE OR REPLACE FUNCTION clean_duplicate_investments()
RETURNS TABLE(
  investor_id UUID,
  investment_date DATE,
  amount DECIMAL,
  duplicates_found INTEGER,
  duplicates_deleted INTEGER
) AS $$
DECLARE
  v_record RECORD;
  v_keep_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Trouver tous les doublons (même investor_id, date, amount)
  FOR v_record IN
    SELECT
      ii.investor_id,
      ii.investment_date::date AS inv_date,
      ii.amount_invested,
      COUNT(*) AS dup_count,
      ARRAY_AGG(ii.id ORDER BY ii.created_at) AS ids
    FROM investor_investments ii
    GROUP BY ii.investor_id, ii.investment_date::date, ii.amount_invested
    HAVING COUNT(*) > 1
  LOOP
    -- Garder le premier (plus ancien), supprimer les autres
    v_keep_id := v_record.ids[1];
    v_deleted_count := 0;

    -- Supprimer tous sauf le premier
    FOR i IN 2..array_length(v_record.ids, 1) LOOP
      DELETE FROM investor_investments WHERE id = v_record.ids[i];
      v_deleted_count := v_deleted_count + 1;
    END LOOP;

    investor_id := v_record.investor_id;
    investment_date := v_record.inv_date;
    amount := v_record.amount_invested;
    duplicates_found := v_record.dup_count;
    duplicates_deleted := v_deleted_count;

    RETURN NEXT;

    RAISE NOTICE '🧹 Nettoyé % doublons pour investisseur % (date: %, montant: %)',
      v_deleted_count, v_record.investor_id, v_record.inv_date, v_record.amount_invested;
  END LOOP;

  -- Recalculer tous les totaux après nettoyage
  PERFORM recalculate_all_investors();

  RAISE NOTICE '✅ Nettoyage terminé, totaux recalculés';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_duplicate_investments IS
'Nettoie les doublons dans investor_investments et recalcule les totaux';

-- =====================================================
-- PARTIE 13: AJOUT D'INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_payment_source ON transactions(payment_source);
CREATE INDEX IF NOT EXISTS idx_transactions_investor_payment_type ON transactions(investor_payment_type);
CREATE INDEX IF NOT EXISTS idx_transactions_affects_compte_courant ON transactions(affects_compte_courant);
CREATE INDEX IF NOT EXISTS idx_investor_investments_transaction_id ON investor_investments(transaction_id);

-- =====================================================
-- PARTIE 14: MIGRATION DES DONNÉES EXISTANTES
-- =====================================================

-- Toutes les transactions existantes utilisent le compte courant par défaut
UPDATE transactions
SET
  payment_source = 'compte_courant',
  affects_compte_courant = TRUE
WHERE payment_source IS NULL;

-- =====================================================
-- PARTIE 15: SYNCHRONISATION INITIALE share_value
-- =====================================================

-- Synchroniser share_value de tous les investisseurs avec la valeur nominale actuelle
DO $$
DECLARE
  v_nominal_value DECIMAL(10, 4);
BEGIN
  -- Récupérer la valeur nominale actuelle
  SELECT nominal_share_value INTO v_nominal_value
  FROM share_settings
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_nominal_value IS NULL THEN
    v_nominal_value := 1.00;
  END IF;

  -- Mettre à jour tous les investisseurs
  UPDATE investors
  SET
    share_value = v_nominal_value,
    current_value = total_shares * v_nominal_value,
    updated_at = NOW();

  RAISE NOTICE '✅ share_value synchronisé à % CAD pour tous les investisseurs', v_nominal_value;
END $$;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ MIGRATION 90B TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Prochaines étapes:';
  RAISE NOTICE '   1. Exécutez: SELECT * FROM clean_duplicate_investments();';
  RAISE NOTICE '   2. Vérifiez: SELECT * FROM recalculate_all_investors();';
  RAISE NOTICE '   3. Testez les nouvelles fonctionnalités';
  RAISE NOTICE '';
END $$;
