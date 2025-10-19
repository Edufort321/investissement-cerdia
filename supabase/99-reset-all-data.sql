-- ==========================================
-- SCRIPT DE RESET COMPLET DE LA BASE DE DONNÉES
-- ⚠️ ATTENTION: Ce script supprime TOUTES les données
-- ==========================================
-- Utilisation: Exécuter ce script via Supabase SQL Editor
-- pour repartir à zéro avec une base de données propre
-- ==========================================

-- Confirmation de sécurité
DO $$
BEGIN
  RAISE NOTICE '⚠️  ATTENTION: Vous êtes sur le point de SUPPRIMER TOUTES LES DONNÉES!';
  RAISE NOTICE 'Ce script va vider:';
  RAISE NOTICE '  - Toutes les transactions';
  RAISE NOTICE '  - Toutes les propriétés (projets)';
  RAISE NOTICE '  - Tous les investisseurs';
  RAISE NOTICE '  - Tous les documents';
  RAISE NOTICE '  - Toutes les pièces jointes (transactions et projets)';
  RAISE NOTICE '  - Tous les calendriers de paiement';
  RAISE NOTICE '';
  RAISE NOTICE '✅ La structure des tables sera conservée';
  RAISE NOTICE '✅ Les vues et fonctions seront conservées';
  RAISE NOTICE '';
END $$;

-- Désactiver temporairement les triggers pour accélérer
ALTER TABLE transactions DISABLE TRIGGER ALL;
ALTER TABLE properties DISABLE TRIGGER ALL;
ALTER TABLE investors DISABLE TRIGGER ALL;
ALTER TABLE documents DISABLE TRIGGER ALL;
ALTER TABLE transaction_attachments DISABLE TRIGGER ALL;
ALTER TABLE property_attachments DISABLE TRIGGER ALL;
ALTER TABLE payment_schedules DISABLE TRIGGER ALL;

-- Supprimer les données dans l'ordre inverse des dépendances
-- (pour respecter les contraintes de clés étrangères)

-- 1. Supprimer les pièces jointes de transactions
DELETE FROM transaction_attachments;
RAISE NOTICE '✓ Pièces jointes transactions supprimées';

-- 2. Supprimer les pièces jointes de projets
DELETE FROM property_attachments;
RAISE NOTICE '✓ Pièces jointes projets supprimées';

-- 3. Supprimer les calendriers de paiement
DELETE FROM payment_schedules;
RAISE NOTICE '✓ Calendriers de paiement supprimés';

-- 4. Supprimer les transactions
DELETE FROM transactions;
RAISE NOTICE '✓ Transactions supprimées';

-- 5. Supprimer les documents investisseurs
DELETE FROM documents;
RAISE NOTICE '✓ Documents investisseurs supprimés';

-- 6. Supprimer les propriétés (projets)
DELETE FROM properties;
RAISE NOTICE '✓ Propriétés (projets) supprimées';

-- 7. Supprimer les investisseurs
DELETE FROM investors;
RAISE NOTICE '✓ Investisseurs supprimés';

-- Réactiver les triggers
ALTER TABLE transactions ENABLE TRIGGER ALL;
ALTER TABLE properties ENABLE TRIGGER ALL;
ALTER TABLE investors ENABLE TRIGGER ALL;
ALTER TABLE documents ENABLE TRIGGER ALL;
ALTER TABLE transaction_attachments ENABLE TRIGGER ALL;
ALTER TABLE property_attachments ENABLE TRIGGER ALL;
ALTER TABLE payment_schedules ENABLE TRIGGER ALL;

-- Reset des séquences (si vous en avez)
-- Note: UUID ne nécessite pas de reset de séquence

-- Vérification finale
SELECT
  '🎉 RESET COMPLET TERMINÉ!' as status,
  (SELECT COUNT(*) FROM transactions) as transactions_count,
  (SELECT COUNT(*) FROM properties) as properties_count,
  (SELECT COUNT(*) FROM investors) as investors_count,
  (SELECT COUNT(*) FROM documents) as documents_count,
  (SELECT COUNT(*) FROM transaction_attachments) as transaction_attachments_count,
  (SELECT COUNT(*) FROM property_attachments) as property_attachments_count,
  (SELECT COUNT(*) FROM payment_schedules) as payment_schedules_count;

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ BASE DE DONNÉES VIDÉE AVEC SUCCÈS!';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Vous pouvez maintenant:';
  RAISE NOTICE '1. Ajouter vos nouveaux investisseurs';
  RAISE NOTICE '2. Créer vos nouveaux projets';
  RAISE NOTICE '3. Enregistrer vos transactions';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  N''oubliez pas de:';
  RAISE NOTICE '- Vider également les buckets Storage si nécessaire';
  RAISE NOTICE '  → transaction-attachments';
  RAISE NOTICE '  → property-attachments';
  RAISE NOTICE '  → documents';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- INSTRUCTIONS POUR VIDER LES BUCKETS STORAGE
-- ==========================================
-- Les fichiers dans Supabase Storage ne sont PAS supprimés automatiquement.
-- Vous devez les supprimer manuellement via l'interface Supabase:
--
-- 1. Allez dans Storage → Buckets
-- 2. Pour chaque bucket (transaction-attachments, property-attachments, documents):
--    a. Cliquez sur le bucket
--    b. Sélectionnez tous les fichiers (Ctrl+A)
--    c. Cliquez sur "Delete"
--
-- OU utilisez l'API Supabase pour vider les buckets programmatiquement
-- ==========================================
