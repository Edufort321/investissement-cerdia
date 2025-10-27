-- =====================================================
-- SCRIPT 41: CORRECTION FINALE DES TYPES D'INVESTISSEMENT
--
-- Ce script corrige definitivement la contrainte investment_type
-- pour supporter TOUS les types utilises dans l'application:
--
-- Types supportes:
--   - 'part'        : Parts sociales (societe a commandite)
--   - 'immobilier'  : Investissement immobilier
--   - 'actions'     : Actions de societe
--   - 'mixte'       : Portefeuille mixte
--   - 'capital'     : Apport en capital
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- Etape 1: Supprimer l'ancienne contrainte
DO $$
BEGIN
    -- Supprimer toutes les contraintes investment_type existantes
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'investors'::regclass
          AND conname = 'investors_investment_type_check'
    ) THEN
        ALTER TABLE investors DROP CONSTRAINT investors_investment_type_check;
        RAISE NOTICE 'Ancienne contrainte investment_type supprimee';
    ELSE
        RAISE NOTICE 'Aucune contrainte investment_type a supprimer';
    END IF;
END $$;

-- Etape 2: Creer la nouvelle contrainte avec TOUS les types
ALTER TABLE investors
ADD CONSTRAINT investors_investment_type_check
CHECK (investment_type IN ('part', 'immobilier', 'actions', 'mixte', 'capital'));

-- Etape 3: Mettre a jour les valeurs par defaut si necessaire
-- (Assurer que les investisseurs existants avec NULL ont une valeur)
UPDATE investors
SET investment_type = 'part'
WHERE investment_type IS NULL;

-- Etape 4: Rendre la colonne NOT NULL (bonne pratique)
ALTER TABLE investors
ALTER COLUMN investment_type SET NOT NULL;

-- Etape 5: Ajouter un commentaire pour documentation
COMMENT ON COLUMN investors.investment_type IS
'Type d''investissement: part (societe a commandite), immobilier, actions, mixte, ou capital';

-- Verification finale
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conrelid = 'investors'::regclass
      AND conname = 'investors_investment_type_check';

    RAISE NOTICE 'Contrainte creee avec succes: %', constraint_def;
END $$;

-- Afficher les types d'investissement actuellement utilises
SELECT
    investment_type,
    COUNT(*) as nombre_investisseurs
FROM investors
GROUP BY investment_type
ORDER BY investment_type;

-- Message de confirmation
SELECT 'MIGRATION 41 TERMINEE - Types d''investissement: part, immobilier, actions, mixte, capital' AS status;
