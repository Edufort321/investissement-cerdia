-- ==========================================
-- MIGRATION 96: CORRIGER LA CONTRAINTE CATEGORY
-- ==========================================
--
-- PROBLÈME: La contrainte transactions_category_check limite category à seulement:
--           'capital', 'operation', 'maintenance', 'admin'
--
-- SOLUTION: Élargir la contrainte pour inclure toutes les valeurs utilisées
--           dans l'application (alignement avec le champ type)
--
-- ==========================================

-- Supprimer l'ancienne contrainte trop restrictive
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

-- Créer la nouvelle contrainte avec toutes les valeurs nécessaires
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (category IN (
    -- Catégories existantes
    'capital',
    'operation',
    'maintenance',
    'admin',

    -- Catégories supplémentaires utilisées par l'application
    'investissement',
    'loyer',
    'dividende',
    'paiement',
    'achat_propriete',
    'depense',
    'capex',
    'remboursement_investisseur',
    'courant',
    'rnd',
    'projet'
  ));

COMMENT ON CONSTRAINT transactions_category_check ON transactions IS
  'Catégories de transactions autorisées - alignées avec le champ type';

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 96 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Contrainte transactions_category_check mise à jour';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Catégories maintenant autorisées:';
  RAISE NOTICE '   • capital, operation, maintenance, admin';
  RAISE NOTICE '   • investissement, loyer, dividende, paiement';
  RAISE NOTICE '   • achat_propriete, depense, capex';
  RAISE NOTICE '   • remboursement_investisseur, courant, rnd, projet';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Vous pouvez maintenant créer des transactions avec toutes ces catégories';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
