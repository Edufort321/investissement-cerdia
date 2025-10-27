-- Migration: Ajouter l'option 'add_to_total' pour initial_fees_distribution dans la table properties
-- Date: 2025-01-27
-- Description: Permet d'ajouter les frais initiaux au total au lieu de les déduire (table properties)

-- Supprimer l'ancienne contrainte check si elle existe
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_initial_fees_distribution_check;

-- Ajouter la nouvelle contrainte avec 'add_to_total'
ALTER TABLE properties
ADD CONSTRAINT properties_initial_fees_distribution_check
CHECK (initial_fees_distribution IN ('equal', 'first_payment', 'add_to_total'));

-- Commentaire
COMMENT ON COLUMN properties.initial_fees_distribution IS
'Comment répartir les frais initiaux: equal (répartir également), first_payment (déduire du premier paiement), add_to_total (ajouter au total)';
