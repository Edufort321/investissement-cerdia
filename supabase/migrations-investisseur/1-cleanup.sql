-- =====================================================
-- SCRIPT 1/5: NETTOYAGE COMPLET
-- Supprime TOUT pour repartir à zéro
-- =====================================================

-- Désactiver les triggers temporairement
SET session_replication_role = replica;

-- Supprimer les vues
DROP VIEW IF EXISTS summary_view CASCADE;

-- Supprimer les politiques RLS
DROP POLICY IF EXISTS "Allow all for authenticated" ON investors;
DROP POLICY IF EXISTS "Allow all for authenticated" ON properties;
DROP POLICY IF EXISTS "Allow all for authenticated" ON documents;
DROP POLICY IF EXISTS "Allow all for authenticated" ON transactions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON dividends;
DROP POLICY IF EXISTS "Allow all for authenticated" ON dividend_allocations;
DROP POLICY IF EXISTS "Allow all for authenticated" ON capex_accounts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON current_accounts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON rnd_accounts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON operational_expenses;
DROP POLICY IF EXISTS "Allow all for authenticated" ON reports;

-- Supprimer tous les triggers
DROP TRIGGER IF EXISTS update_investors_updated_at ON investors;
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_dividends_updated_at ON dividends;
DROP TRIGGER IF EXISTS update_capex_accounts_updated_at ON capex_accounts;
DROP TRIGGER IF EXISTS update_current_accounts_updated_at ON current_accounts;
DROP TRIGGER IF EXISTS update_rnd_accounts_updated_at ON rnd_accounts;
DROP TRIGGER IF EXISTS update_operational_expenses_updated_at ON operational_expenses;
DROP TRIGGER IF EXISTS update_percentages_after_investment ON investors;

-- Supprimer toutes les fonctions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_investor_percentages() CASCADE;

-- Supprimer toutes les tables (dans le bon ordre pour éviter les erreurs de dépendances)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS operational_expenses CASCADE;
DROP TABLE IF EXISTS rnd_accounts CASCADE;
DROP TABLE IF EXISTS current_accounts CASCADE;
DROP TABLE IF EXISTS capex_accounts CASCADE;
DROP TABLE IF EXISTS dividend_allocations CASCADE;
DROP TABLE IF EXISTS dividends CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS investors CASCADE;

-- Réactiver les triggers
SET session_replication_role = DEFAULT;

-- Message de confirmation
SELECT 'NETTOYAGE TERMINÉ - Exécute maintenant 2-create-tables.sql' AS message;
