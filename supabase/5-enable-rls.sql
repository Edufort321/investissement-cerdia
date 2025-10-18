-- =====================================================
-- SCRIPT 5/5: ACTIVATION DU ROW LEVEL SECURITY (RLS)
-- Sécurise l'accès aux données
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividend_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE capex_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rnd_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Politiques PERMISSIVES pour le développement
-- (À restreindre en production!)

CREATE POLICY "Allow all for authenticated"
ON investors FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON properties FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON documents FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON transactions FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON dividends FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON dividend_allocations FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON capex_accounts FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON current_accounts FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON rnd_accounts FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON operational_expenses FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated"
ON reports FOR ALL
USING (auth.role() = 'authenticated');

-- Message de confirmation
SELECT '✅ RLS ACTIVÉ - Exécute maintenant 6-insert-data.sql' AS message;
