-- =====================================================
-- 💰 PROPRIÉTÉS: OPTIONS DE FRAIS INITIAUX
-- =====================================================
-- Script pour transférer les options de frais initiaux lors de la conversion scénario → projet
-- Date: 2025-10-26
-- Objectif: Permettre aux propriétés converties de conserver les options de répartition des frais

-- 1. Ajouter colonnes pour options de frais dans properties
-- =====================================================

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS initial_fees_distribution VARCHAR(20) DEFAULT 'first_payment' CHECK (initial_fees_distribution IN ('equal', 'first_payment')),
ADD COLUMN IF NOT EXISTS deduct_initial_from_first_term BOOLEAN DEFAULT false;

COMMENT ON COLUMN properties.initial_fees_distribution IS 'Répartition des frais initiaux transférée du scénario: equal (égal sur tous termes) ou first_payment (sur premier paiement)';
COMMENT ON COLUMN properties.deduct_initial_from_first_term IS 'Si true, déduire l''acompte initial du premier terme de paiement';

-- 2. Mise à jour des propriétés existantes
-- =====================================================

-- Par défaut, toutes les propriétés existantes utilisent first_payment et false
UPDATE properties
SET
  initial_fees_distribution = 'first_payment',
  deduct_initial_from_first_term = false
WHERE
  initial_fees_distribution IS NULL
  OR deduct_initial_from_first_term IS NULL;

-- =====================================================
-- 📋 RÉSUMÉ
-- =====================================================

/*
Nouvelles colonnes dans properties:
- initial_fees_distribution: Répartition frais initiaux (transférée du scénario)
  - 'first_payment': Appliquer au premier paiement
  - 'equal': Répartir également sur tous les termes
- deduct_initial_from_first_term: Déduire acompte du premier terme (transféré du scénario)

Valeurs par défaut:
- initial_fees_distribution = 'first_payment'
- deduct_initial_from_first_term = false

Fonctionnement:
- Lors de la conversion scénario → projet (ScenariosTab.tsx markAsPurchased):
  - Ces champs sont copiés du scénario vers la propriété
  - Conserve les préférences de l'utilisateur pour la propriété
  - Permet de consulter les options appliquées après conversion

Next steps:
1. Exécuter ce script dans Supabase SQL Editor
2. Vérifier que les colonnes sont créées
3. Tester conversion scénario → projet avec ces options
*/
