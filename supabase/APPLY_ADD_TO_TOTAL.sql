-- Migration complète: Ajouter 'add_to_total' aux tables scenarios et properties
-- À exécuter dans le SQL Editor de Supabase
-- Date: 2025-01-27

-- ===================================
-- TABLE: scenarios
-- ===================================

-- Supprimer l'ancienne contrainte check si elle existe
ALTER TABLE scenarios DROP CONSTRAINT IF EXISTS scenarios_initial_fees_distribution_check;

-- Ajouter la nouvelle contrainte avec 'add_to_total'
ALTER TABLE scenarios
ADD CONSTRAINT scenarios_initial_fees_distribution_check
CHECK (initial_fees_distribution IN ('equal', 'first_payment', 'add_to_total'));

-- Commentaire
COMMENT ON COLUMN scenarios.initial_fees_distribution IS
'Comment répartir les frais initiaux: equal (répartir également), first_payment (déduire du premier paiement), add_to_total (ajouter au total)';


-- ===================================
-- TABLE: properties
-- ===================================

-- Supprimer l'ancienne contrainte check si elle existe
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_initial_fees_distribution_check;

-- Ajouter la nouvelle contrainte avec 'add_to_total'
ALTER TABLE properties
ADD CONSTRAINT properties_initial_fees_distribution_check
CHECK (initial_fees_distribution IN ('equal', 'first_payment', 'add_to_total'));

-- Commentaire
COMMENT ON COLUMN properties.initial_fees_distribution IS
'Comment répartir les frais initiaux: equal (répartir également), first_payment (déduire du premier paiement), add_to_total (ajouter au total)';


-- ===================================
-- VÉRIFICATION
-- ===================================

-- Vérifier que les contraintes ont été appliquées
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN ('scenarios_initial_fees_distribution_check', 'properties_initial_fees_distribution_check');
