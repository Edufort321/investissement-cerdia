-- Migration 129: Simplifier l'accès à commerce_products
-- Le catalogue de produits est public par nature.
-- L'admin est protégé côté application (mot de passe + /commerce/admin).
-- RLS crée des conflits avec l'accès anonyme → on le désactive.

ALTER TABLE commerce_products DISABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Public read commerce_products" ON commerce_products;
DROP POLICY IF EXISTS "Auth write commerce_products" ON commerce_products;
DROP POLICY IF EXISTS "Auth update commerce_products" ON commerce_products;
DROP POLICY IF EXISTS "Auth delete commerce_products" ON commerce_products;

-- Même chose pour commerce_transactions
ALTER TABLE commerce_transactions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read commerce_transactions" ON commerce_transactions;
DROP POLICY IF EXISTS "Auth write commerce_transactions" ON commerce_transactions;
