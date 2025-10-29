-- =====================================================
-- MIGRATION 95: SYSTÈME COMPLET TRANSACTIONS
-- Date: 2025-01-28
-- Description: Finalise le système transactions comme source unique de vérité
--              + Support CAPEX + Vues calculées temps réel
-- =====================================================

-- =====================================================
-- ÉTAPE 1: VÉRIFIER/AJOUTER COLONNES TRANSACTIONS
-- =====================================================

-- Vérifier que payment_source supporte 'capex'
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'transactions' AND constraint_name LIKE '%payment_source%'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_source_check;
  END IF;

  -- Ajouter la nouvelle contrainte avec 'capex'
  ALTER TABLE transactions
  ADD CONSTRAINT transactions_payment_source_check
  CHECK (payment_source IN ('compte_courant', 'investisseur_direct', 'capex'));

  RAISE NOTICE '✅ payment_source mis à jour avec option capex';
END $$;

-- Ajouter bank_account_id si manquant (lier aux comptes bancaires)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'bank_account_id'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id);
    RAISE NOTICE '✅ bank_account_id ajouté';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 2: VUES CALCULÉES - CAPEX TEMPS RÉEL
-- =====================================================

-- Vue: Résumé CAPEX par année (calculé depuis transactions)
CREATE OR REPLACE VIEW v_capex_summary AS
SELECT
  EXTRACT(YEAR FROM date) AS year,
  SUM(CASE WHEN payment_source = 'capex' AND amount > 0 THEN amount ELSE 0 END) AS capex_received,
  SUM(CASE WHEN category = 'capex' AND amount < 0 THEN ABS(amount) ELSE 0 END) AS capex_spent,
  SUM(CASE
    WHEN payment_source = 'capex' AND amount > 0 THEN amount
    WHEN category = 'capex' AND amount < 0 THEN amount
    ELSE 0
  END) AS capex_balance,
  COUNT(*) AS transaction_count
FROM transactions
WHERE payment_source = 'capex' OR category = 'capex'
GROUP BY EXTRACT(YEAR FROM date)
ORDER BY year DESC;

COMMENT ON VIEW v_capex_summary IS 'Résumé CAPEX par année - Calculé depuis transactions en temps réel';

-- =====================================================
-- ÉTAPE 3: VUES CALCULÉES - COMPTE COURANT TEMPS RÉEL
-- =====================================================

-- Vue: Compte courant mensuel (calculé depuis transactions)
CREATE OR REPLACE VIEW v_compte_courant_monthly AS
SELECT
  EXTRACT(YEAR FROM date) AS year,
  EXTRACT(MONTH FROM date) AS month,
  TO_CHAR(date, 'YYYY-MM') AS period,

  -- Entrées (inflow)
  SUM(CASE
    WHEN affects_compte_courant = TRUE AND amount > 0 THEN amount
    ELSE 0
  END) AS total_inflow,

  -- Sorties (outflow)
  SUM(CASE
    WHEN affects_compte_courant = TRUE AND amount < 0 THEN ABS(amount)
    ELSE 0
  END) AS total_outflow,

  -- Balance nette
  SUM(CASE
    WHEN affects_compte_courant = TRUE THEN amount
    ELSE 0
  END) AS net_balance,

  -- Détails par catégorie
  SUM(CASE WHEN category = 'operation' AND amount < 0 THEN ABS(amount) ELSE 0 END) AS cout_operation,
  SUM(CASE WHEN category = 'maintenance' AND amount < 0 THEN ABS(amount) ELSE 0 END) AS cout_maintenance,
  SUM(CASE WHEN category = 'admin' AND amount < 0 THEN ABS(amount) ELSE 0 END) AS cout_admin,
  SUM(CASE WHEN category = 'projet' AND amount < 0 THEN ABS(amount) ELSE 0 END) AS cout_projet,

  COUNT(*) AS transaction_count
FROM transactions
WHERE affects_compte_courant = TRUE OR affects_compte_courant IS NULL
GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), TO_CHAR(date, 'YYYY-MM')
ORDER BY year DESC, month DESC;

COMMENT ON VIEW v_compte_courant_monthly IS 'Compte courant mensuel - Calculé depuis transactions avec affects_compte_courant';

-- Vue: Compte courant annuel (agrégation de la vue mensuelle)
CREATE OR REPLACE VIEW v_compte_courant_yearly AS
SELECT
  year,
  SUM(total_inflow) AS total_inflow,
  SUM(total_outflow) AS total_outflow,
  SUM(net_balance) AS net_balance,
  SUM(cout_operation) AS cout_operation,
  SUM(cout_maintenance) AS cout_maintenance,
  SUM(cout_admin) AS cout_admin,
  SUM(cout_projet) AS cout_projet,
  SUM(transaction_count) AS transaction_count
FROM v_compte_courant_monthly
GROUP BY year
ORDER BY year DESC;

COMMENT ON VIEW v_compte_courant_yearly IS 'Compte courant annuel - Agrégation de v_compte_courant_monthly';

-- =====================================================
-- ÉTAPE 4: VUES CALCULÉES - FLUX PAR PROPRIÉTÉ
-- =====================================================

-- Vue: Flux financiers par propriété
CREATE OR REPLACE VIEW v_property_cashflow AS
SELECT
  p.id AS property_id,
  p.name AS property_name,
  EXTRACT(YEAR FROM t.date) AS year,

  -- Investissements initiaux
  SUM(CASE WHEN t.type = 'investissement' AND t.property_id = p.id THEN t.amount ELSE 0 END) AS total_invested,

  -- Dépenses projet
  SUM(CASE WHEN t.category = 'projet' AND t.property_id = p.id AND t.amount < 0 THEN ABS(t.amount) ELSE 0 END) AS total_expenses,

  -- Revenus (loyers, etc.)
  SUM(CASE WHEN t.type = 'loyer' AND t.property_id = p.id THEN t.amount ELSE 0 END) AS total_revenue,

  -- Balance nette
  SUM(CASE WHEN t.property_id = p.id THEN t.amount ELSE 0 END) AS net_cashflow,

  COUNT(t.id) AS transaction_count
FROM properties p
LEFT JOIN transactions t ON t.property_id = p.id
GROUP BY p.id, p.name, EXTRACT(YEAR FROM t.date)
ORDER BY p.name, year DESC;

COMMENT ON VIEW v_property_cashflow IS 'Flux financiers par propriété - Calculé depuis transactions';

-- =====================================================
-- ÉTAPE 5: VUES CALCULÉES - FLUX PAR SOURCE
-- =====================================================

-- Vue: Flux par source de paiement
CREATE OR REPLACE VIEW v_cashflow_by_source AS
SELECT
  EXTRACT(YEAR FROM date) AS year,
  EXTRACT(MONTH FROM date) AS month,
  payment_source,

  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_inflow,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS total_outflow,
  SUM(amount) AS net_balance,
  COUNT(*) AS transaction_count
FROM transactions
WHERE payment_source IS NOT NULL
GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), payment_source
ORDER BY year DESC, month DESC, payment_source;

COMMENT ON VIEW v_cashflow_by_source IS 'Flux financiers par source (compte_courant, capex, investisseur_direct)';

-- =====================================================
-- ÉTAPE 6: VUES CALCULÉES - COÛTS D'OPÉRATION
-- =====================================================

-- Vue: Coûts d'opération détaillés
CREATE OR REPLACE VIEW v_operational_costs AS
SELECT
  EXTRACT(YEAR FROM date) AS year,
  EXTRACT(MONTH FROM date) AS month,
  category,
  property_id,

  SUM(ABS(amount)) AS total_cost,
  COUNT(*) AS transaction_count,
  AVG(ABS(amount)) AS avg_cost
FROM transactions
WHERE category IN ('operation', 'maintenance', 'admin')
  AND amount < 0
GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), category, property_id
ORDER BY year DESC, month DESC, category;

COMMENT ON VIEW v_operational_costs IS 'Coûts opérationnels détaillés par catégorie';

-- =====================================================
-- ÉTAPE 7: FONCTION - RÉSUMÉ FINANCIER GLOBAL
-- =====================================================

CREATE OR REPLACE FUNCTION get_financial_summary(p_year INTEGER DEFAULT NULL)
RETURNS TABLE(
  metric TEXT,
  value DECIMAL(15, 2),
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Total Investisseurs' AS metric,
    COALESCE(SUM(amount), 0) AS value,
    'investissement' AS category
  FROM transactions
  WHERE type = 'investissement'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year)

  UNION ALL

  SELECT
    'Compte Courant Balance' AS metric,
    COALESCE(SUM(CASE WHEN affects_compte_courant = TRUE THEN amount ELSE 0 END), 0) AS value,
    'compte_courant' AS category
  FROM transactions
  WHERE p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year

  UNION ALL

  SELECT
    'CAPEX Balance' AS metric,
    COALESCE(SUM(CASE
      WHEN payment_source = 'capex' AND amount > 0 THEN amount
      WHEN category = 'capex' AND amount < 0 THEN amount
      ELSE 0
    END), 0) AS value,
    'capex' AS category
  FROM transactions
  WHERE p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year

  UNION ALL

  SELECT
    'Dépenses Projets' AS metric,
    COALESCE(SUM(ABS(amount)), 0) AS value,
    'projet' AS category
  FROM transactions
  WHERE category = 'projet' AND amount < 0
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year)

  UNION ALL

  SELECT
    'Coûts Opération' AS metric,
    COALESCE(SUM(ABS(amount)), 0) AS value,
    'operation' AS category
  FROM transactions
  WHERE category IN ('operation', 'maintenance', 'admin') AND amount < 0
    AND (p_year IS NULL OR EXTRACT(YEAR FROM date) = p_year);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_financial_summary IS 'Résumé financier global - Optionnel: filtrer par année';

-- =====================================================
-- ÉTAPE 8: FONCTION - VALIDATION TRANSACTION
-- =====================================================

CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Si investisseur sélectionné, forcer payment_source à 'investisseur_direct'
  IF NEW.investor_id IS NOT NULL AND NEW.payment_source != 'investisseur_direct' THEN
    NEW.payment_source := 'investisseur_direct';
    NEW.affects_compte_courant := FALSE;
  END IF;

  -- Si payment_source = 'capex', ne pas affecter compte courant
  IF NEW.payment_source = 'capex' THEN
    NEW.affects_compte_courant := FALSE;
  END IF;

  -- Si payment_source = 'compte_courant', affecter compte courant
  IF NEW.payment_source = 'compte_courant' THEN
    NEW.affects_compte_courant := TRUE;
  END IF;

  -- Si catégorie = 'capex', c'est un transfert vers CAPEX
  IF NEW.category = 'capex' THEN
    -- Vérifier que c'est une sortie (montant négatif)
    IF NEW.amount > 0 THEN
      RAISE EXCEPTION 'Transfert CAPEX doit être un montant négatif (sortie)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer trigger de validation
DROP TRIGGER IF EXISTS validate_transaction_trigger ON transactions;
CREATE TRIGGER validate_transaction_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction();

COMMENT ON FUNCTION validate_transaction IS 'Valide et corrige automatiquement les transactions avant insertion/mise à jour';

-- =====================================================
-- ÉTAPE 9: INDEX PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_payment_source ON transactions(payment_source);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_affects_compte_courant ON transactions(affects_compte_courant);
CREATE INDEX IF NOT EXISTS idx_transactions_date_year ON transactions(EXTRACT(YEAR FROM date));
CREATE INDEX IF NOT EXISTS idx_transactions_date_month ON transactions(EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date));

-- =====================================================
-- ÉTAPE 10: MIGRATION DONNÉES EXISTANTES
-- =====================================================

-- Mettre à jour affects_compte_courant pour transactions existantes
UPDATE transactions
SET affects_compte_courant = CASE
  WHEN payment_source = 'investisseur_direct' THEN FALSE
  WHEN payment_source = 'capex' THEN FALSE
  ELSE TRUE
END
WHERE affects_compte_courant IS NULL;

-- Forcer payment_source = 'investisseur_direct' si investisseur présent
UPDATE transactions
SET payment_source = 'investisseur_direct',
    affects_compte_courant = FALSE
WHERE investor_id IS NOT NULL
  AND payment_source != 'investisseur_direct';

-- =====================================================
-- FIN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ MIGRATION 95 TERMINÉE';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Vues créées:';
  RAISE NOTICE '   - v_capex_summary (CAPEX par année)';
  RAISE NOTICE '   - v_compte_courant_monthly (Compte courant mensuel)';
  RAISE NOTICE '   - v_compte_courant_yearly (Compte courant annuel)';
  RAISE NOTICE '   - v_property_cashflow (Flux par propriété)';
  RAISE NOTICE '   - v_cashflow_by_source (Flux par source)';
  RAISE NOTICE '   - v_operational_costs (Coûts opération)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Fonctions créées:';
  RAISE NOTICE '   - get_financial_summary(year) (Résumé financier)';
  RAISE NOTICE '   - validate_transaction() (Validation auto)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Triggers actifs:';
  RAISE NOTICE '   - validate_transaction_trigger (BEFORE INSERT/UPDATE)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Le système est maintenant 100%% basé sur TRANSACTIONS';
  RAISE NOTICE '';
END $$;
