-- =====================================================
-- SCRIPT 23: SUPPRESSION DES PROJETS EXISTANTS
-- =====================================================
-- Description: Supprime tous les projets existants car ils doivent maintenant être créés via scénarios
-- ATTENTION: Ce script est destructif! Assurez-vous d'avoir une sauvegarde si nécessaire
-- =====================================================

-- Afficher les projets qui vont être supprimés
DO $$
DECLARE
  prop_count INT;
  trans_count INT;
  sched_count INT;
BEGIN
  SELECT COUNT(*) INTO prop_count FROM properties;
  SELECT COUNT(*) INTO trans_count FROM transactions;
  SELECT COUNT(*) INTO sched_count FROM payment_schedules;

  RAISE NOTICE '⚠️  ATTENTION: Cette opération va supprimer:';
  RAISE NOTICE '   - % propriété(s)', prop_count;
  RAISE NOTICE '   - % transaction(s)', trans_count;
  RAISE NOTICE '   - % terme(s) de paiement', sched_count;
  RAISE NOTICE '';
  RAISE NOTICE '📌 Les projets devront maintenant être créés via l''onglet Évaluateur';
  RAISE NOTICE '   (Scénario → Analyse → Vote → Marquer comme acheté)';
  RAISE NOTICE '';
END $$;

-- Supprimer les transactions (dépendent des propriétés)
DELETE FROM transactions;

-- Supprimer les termes de paiement (dépendent des propriétés)
DELETE FROM payment_schedules;

-- Supprimer les documents de propriétés (si la table existe)
DELETE FROM scenario_documents WHERE id IN (
  SELECT id FROM scenario_documents WHERE scenario_id IS NULL
);

-- Supprimer les propriétés
DELETE FROM properties;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ SCRIPT 23: PROJETS EXISTANTS SUPPRIMÉS';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Prochaines étapes:';
  RAISE NOTICE '   1. Aller dans l''onglet Évaluateur';
  RAISE NOTICE '   2. Créer un nouveau scénario';
  RAISE NOTICE '   3. Ajouter les documents du promoteur';
  RAISE NOTICE '   4. Analyser le scénario (génère 3 projections)';
  RAISE NOTICE '   5. Soumettre au vote des investisseurs';
  RAISE NOTICE '   6. Une fois approuvé, marquer comme "Acheté"';
  RAISE NOTICE '   7. Le projet apparaîtra automatiquement dans l''onglet Projet';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Astuce Admin: Vous pouvez forcer l''approbation sans attendre les votes';
  RAISE NOTICE '';
END $$;
