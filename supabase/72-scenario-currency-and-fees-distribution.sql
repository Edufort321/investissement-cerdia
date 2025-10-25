-- =====================================================
-- 💱 SCÉNARIOS: DEVISE ET RÉPARTITION FRAIS INITIAUX
-- =====================================================
-- Script pour ajouter sélection devise et options répartition frais
-- Date: 2025-10-25
-- Objectif: Permettre choix devise prix d'achat et répartition frais initiaux

-- 1. Ajouter colonnes pour devise et répartition
-- =====================================================

ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3) DEFAULT 'USD' CHECK (purchase_currency IN ('USD', 'CAD')),
ADD COLUMN IF NOT EXISTS initial_fees_distribution VARCHAR(20) DEFAULT 'first_payment' CHECK (initial_fees_distribution IN ('equal', 'first_payment'));

COMMENT ON COLUMN scenarios.purchase_currency IS 'Devise du prix d''achat (USD ou CAD)';
COMMENT ON COLUMN scenarios.initial_fees_distribution IS 'Répartition des frais initiaux: equal (égal sur tous termes) ou first_payment (sur premier paiement)';

-- 2. Mise à jour des scénarios existants
-- =====================================================

-- Par défaut, tous les scénarios existants utilisent USD et first_payment
UPDATE scenarios
SET
  purchase_currency = 'USD',
  initial_fees_distribution = 'first_payment'
WHERE
  purchase_currency IS NULL
  OR initial_fees_distribution IS NULL;

-- 3. Créer index pour recherche rapide
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_scenarios_purchase_currency
ON scenarios(purchase_currency)
WHERE purchase_currency IS NOT NULL;

-- =====================================================
-- 📋 RÉSUMÉ
-- =====================================================

/*
Nouvelles colonnes:
- purchase_currency: Devise prix d'achat (USD ou CAD)
- initial_fees_distribution: Répartition frais initiaux
  - 'first_payment': Appliquer au premier paiement
  - 'equal': Répartir également sur tous les termes

Valeurs par défaut:
- purchase_currency = 'USD'
- initial_fees_distribution = 'first_payment'

Next steps:
1. Exécuter ce script dans Supabase SQL Editor
2. Vérifier que les colonnes sont créées
3. Tester création nouveau scénario avec ces options
*/
