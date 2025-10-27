-- =====================================================
-- SCRIPT 39: Mise à jour des contraintes pour société à commandite
-- - Ajoute 'part' comme type d'investissement
-- - Rend action_class nullable avec valeur par défaut 'A'
-- =====================================================

-- Supprimer la contrainte existante sur investment_type
ALTER TABLE investors DROP CONSTRAINT IF EXISTS investors_investment_type_check;

-- Ajouter la nouvelle contrainte avec 'part'
ALTER TABLE investors ADD CONSTRAINT investors_investment_type_check
CHECK (investment_type IN ('immobilier', 'actions', 'mixte', 'part'));

-- Supprimer la contrainte existante sur action_class
ALTER TABLE investors DROP CONSTRAINT IF EXISTS investors_action_class_check;

-- Rendre action_class nullable (au lieu de NOT NULL)
ALTER TABLE investors ALTER COLUMN action_class DROP NOT NULL;

-- Définir une valeur par défaut pour action_class
ALTER TABLE investors ALTER COLUMN action_class SET DEFAULT 'A';

-- Ajouter la nouvelle contrainte sur action_class (nullable, mais si présent doit être A ou B)
ALTER TABLE investors ADD CONSTRAINT investors_action_class_check
CHECK (action_class IS NULL OR action_class IN ('A', 'B'));

-- Mettre à jour les investisseurs existants qui ont 'immobilier' pour avoir 'part' si nécessaire
-- (Commenté car dépend de votre besoin)
-- UPDATE investors SET investment_type = 'part' WHERE investment_type = 'immobilier';
