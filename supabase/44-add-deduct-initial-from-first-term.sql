-- =====================================================
-- SCRIPT 44: AJOUT DE L'OPTION DE DÉDUCTION D'ACOMPTE
--
-- Ce script ajoute la colonne deduct_initial_from_first_term
-- à la table scenarios pour permettre de déduire automatiquement
-- l'acompte initial du premier terme de paiement.
--
-- Exemple:
-- Prix: 178,000$
-- Acompte: 2,000$
-- Premier terme (20%): 35,600$ - 2,000$ = 33,600$
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- Ajouter la colonne deduct_initial_from_first_term
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS deduct_initial_from_first_term BOOLEAN DEFAULT false;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN scenarios.deduct_initial_from_first_term IS
'Si true, l''acompte initial (initial_fees) sera déduit du premier terme de paiement lors de la conversion en projet';

-- Message de confirmation
SELECT 'MIGRATION 44 TERMINEE - Colonne deduct_initial_from_first_term ajoutée' AS status;
