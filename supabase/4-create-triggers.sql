-- =====================================================
-- SCRIPT 4/5: CRÉATION DES TRIGGERS ET FONCTIONS
-- Automatise les mises à jour et calculs
-- =====================================================

-- FONCTION 1: Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FONCTION 2: Calcul automatique des pourcentages
CREATE OR REPLACE FUNCTION calculate_investor_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_value DECIMAL(15, 2);
BEGIN
  SELECT COALESCE(SUM(total_invested), 0) INTO total_value
  FROM investors
  WHERE status = 'actif';

  IF total_value > 0 THEN
    UPDATE investors
    SET percentage_ownership = ROUND((total_invested / total_value * 100)::numeric, 2)
    WHERE status = 'actif';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS pour updated_at
CREATE TRIGGER update_investors_updated_at
  BEFORE UPDATE ON investors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dividends_updated_at
  BEFORE UPDATE ON dividends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capex_accounts_updated_at
  BEFORE UPDATE ON capex_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_current_accounts_updated_at
  BEFORE UPDATE ON current_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rnd_accounts_updated_at
  BEFORE UPDATE ON rnd_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operational_expenses_updated_at
  BEFORE UPDATE ON operational_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- TRIGGER pour calcul automatique des pourcentages
CREATE TRIGGER update_percentages_after_investment
  AFTER INSERT OR UPDATE OF total_invested ON investors
  FOR EACH ROW
  EXECUTE FUNCTION calculate_investor_percentages();

-- VUE pour le sommaire
CREATE OR REPLACE VIEW summary_view AS
SELECT
  'Investissement CERDIA inc' AS company_name,
  COALESCE(SUM(i.current_value), 0) AS current_total_value,
  COALESCE(SUM(i.total_invested), 0) AS total_invested,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE type = 'investissement'), 0) AS total_investment,
  COALESCE(SUM(i.total_shares), 0) AS total_shares,
  COALESCE((SELECT balance FROM current_accounts WHERE year = EXTRACT(YEAR FROM NOW()) LIMIT 1), 0) AS current_account,
  COALESCE((SELECT total_reserve FROM capex_accounts WHERE year = EXTRACT(YEAR FROM NOW()) LIMIT 1), 0) AS capex_account,
  0 AS available_liquidity,
  1000.00 AS class_a_value,
  1150.00 AS class_b_value,
  NOW() AS last_updated
FROM investors i
WHERE i.status = 'actif';

-- Message de confirmation
SELECT '✅ TRIGGERS ET FONCTIONS CRÉÉS - Exécute maintenant 5-enable-rls.sql' AS message;
