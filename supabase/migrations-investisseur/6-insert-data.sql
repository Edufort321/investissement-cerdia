-- =====================================================
-- SCRIPT 6/6: INSERTION DES DONNÉES
-- Ajoute les 4 investisseurs, 3 propriétés et comptes
-- =====================================================

-- Investisseurs
INSERT INTO investors (first_name, last_name, email, phone, username, action_class, total_shares, share_value, total_invested, current_value, investment_type, access_level, permissions)
VALUES
  ('Éric', 'Dufort', 'eric.dufort@cerdia.com', '', 'Eric Dufort', 'A', 96731.69, 1.00, 96731.69, 96731.69, 'immobilier', 'admin', '{"dashboard": true, "projet": true, "administration": true}'::jsonb),
  ('Chad', 'Rodrigue', 'chad.rodrigue@cerdia.com', '', 'Chad Rodrigue', 'A', 100000.00, 1.00, 100000.00, 100000.00, 'immobilier', 'investisseur', '{"dashboard": true, "projet": false, "administration": false}'::jsonb),
  ('Alexandre', 'Toulouse', 'alexandre.toulouse@cerdia.com', '', 'Alexandre Toulouse', 'A', 48183.50, 1.00, 48183.50, 48183.50, 'immobilier', 'investisseur', '{"dashboard": true, "projet": false, "administration": false}'::jsonb),
  ('Pierre', 'Dufort', 'pierre.dufort@cerdia.com', '', 'Pierre Dufort', 'A', 100000.00, 1.00, 100000.00, 100000.00, 'immobilier', 'investisseur', '{"dashboard": true, "projet": false, "administration": false}'::jsonb);

-- Propriétés
INSERT INTO properties (name, location, status, total_cost, paid_amount, reservation_date, expected_roi)
VALUES
  ('Oasis Bay A301', 'Punta Cana, République Dominicaine', 'en_construction', 150000.00, 116817.94, '2025-04-05', 10.2),
  ('Oasis Bay A302', 'Punta Cana, République Dominicaine', 'en_construction', 150000.00, 117365.24, '2025-03-20', 10.2),
  ('Secret Garden H-212', 'Punta Cana, République Dominicaine', 'reservation', 250000.00, 187228.77, '2025-05-20', 12.5);

-- Comptes CAPEX
INSERT INTO capex_accounts (year, investment_capex, operation_capex)
VALUES (2025, 0, 0);

-- Comptes Courant
INSERT INTO current_accounts (year, balance, total_deposits, total_withdrawals)
VALUES (2025, 0, 0, 0);

-- Comptes R&D
INSERT INTO rnd_accounts (year, investment_capex, operation_capex, dividend_total)
VALUES (2026, 0, 0, 0);

-- Message de confirmation
SELECT '✅ DONNÉES INSÉRÉES - BASE DE DONNÉES COMPLÈTE!' AS message;
