-- ==========================================
-- MIGRATION 97: AJOUTER LE TYPE 'PAIEMENT'
-- ==========================================
--
-- PROBLÈME: Le type 'paiement' est utilisé dans l'interface TransactionsTab
--           mais n'est pas autorisé par la contrainte transactions_type_check
--
-- SOLUTION: Ajouter 'paiement' à la liste des types autorisés
--
-- ==========================================

-- Supprimer l'ancienne contrainte
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Créer la nouvelle contrainte avec 'paiement' inclus
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    -- ENTRÉES D'ARGENT (montant positif)
    'investissement',  -- Investisseur achète des parts
    'loyer',          -- Revenus locatifs
    'dividende',      -- Distribution de profits

    -- SORTIES D'ARGENT (montant négatif)
    'paiement',       -- Paiement général (NOUVEAU)
    'achat_propriete', -- Achat de propriété
    'depense',        -- Dépense générale
    'capex',          -- Amélioration propriété
    'maintenance',    -- Entretien propriété
    'admin',          -- Frais administratifs
    'remboursement_investisseur', -- Remboursement investisseur
    'courant',        -- Compte courant
    'rnd'             -- Recherche & développement
  ));

COMMENT ON CONSTRAINT transactions_type_check ON transactions IS
  'Types de transactions autorisés - inclut paiement pour compatibilité TransactionsTab';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 97 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Type "paiement" ajouté à transactions_type_check';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Types maintenant autorisés:';
  RAISE NOTICE '   ENTRÉES: investissement, loyer, dividende';
  RAISE NOTICE '   SORTIES: paiement, achat_propriete, depense, capex,';
  RAISE NOTICE '            maintenance, admin, remboursement_investisseur,';
  RAISE NOTICE '            courant, rnd';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Vous pouvez maintenant créer des transactions de type "paiement"';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
