-- Script 40: Correction de la contrainte investment_type
-- Ce script verifie et corrige la contrainte pour accepter tous les types d'investissement

-- Etape 1: Supprimer l'ancienne contrainte si elle existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'investors_investment_type_check'
    ) THEN
        ALTER TABLE investors DROP CONSTRAINT investors_investment_type_check;
        RAISE NOTICE 'Contrainte investors_investment_type_check supprimee';
    ELSE
        RAISE NOTICE 'Contrainte investors_investment_type_check n existe pas';
    END IF;
END $$;

-- Etape 2: Ajouter la nouvelle contrainte avec tous les types acceptes
ALTER TABLE investors
ADD CONSTRAINT investors_investment_type_check
CHECK (investment_type IN ('immobilier', 'actions', 'mixte', 'part'));

-- Verification: Afficher la nouvelle contrainte
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'investors_investment_type_check';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Contrainte mise a jour avec succes. Types acceptes: immobilier, actions, mixte, part';
END $$;
