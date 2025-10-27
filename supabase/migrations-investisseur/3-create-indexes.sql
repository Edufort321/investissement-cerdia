-- =====================================================
-- SCRIPT 3/5: CRÉATION DES INDEXES
-- Améliore les performances des requêtes
-- =====================================================

-- Indexes sur investors
CREATE INDEX idx_investors_user_id ON investors(user_id);
CREATE INDEX idx_investors_email ON investors(email);
CREATE INDEX idx_investors_username ON investors(username);
CREATE INDEX idx_investors_status ON investors(status);

-- Indexes sur transactions
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_investor_id ON transactions(investor_id);
CREATE INDEX idx_transactions_property_id ON transactions(property_id);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Indexes sur documents
CREATE INDEX idx_documents_transaction_id ON documents(transaction_id);
CREATE INDEX idx_documents_property_id ON documents(property_id);
CREATE INDEX idx_documents_investor_id ON documents(investor_id);

-- Indexes sur dividend_allocations
CREATE INDEX idx_dividend_allocations_dividend_id ON dividend_allocations(dividend_id);
CREATE INDEX idx_dividend_allocations_investor_id ON dividend_allocations(investor_id);

-- Message de confirmation
SELECT '✅ INDEXES CRÉÉS - Exécute maintenant 4-create-triggers.sql' AS message;
