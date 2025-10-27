-- ============================================================
-- DÉPLOIEMENT COMPLET - MON VOYAGE CERDIA
-- ============================================================
-- Ce fichier consolide toutes les migrations (001-012)
-- Exécutez ce fichier unique dans Supabase SQL Editor
-- ============================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🚀 Début du déploiement Mon Voyage CERDIA'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''

\echo '📋 Étape 1/12: Création table voyages...'
\ir 001_create_voyages_table.sql

\echo '📋 Étape 2/12: Création table evenements...'
\ir 002_create_evenements_table.sql

\echo '📋 Étape 3/12: Création table depenses...'
\ir 003_create_depenses_table.sql

\echo '📋 Étape 4/12: Création table checklist...'
\ir 004_create_checklist_table.sql

\echo '📋 Étape 5/12: Création table photos...'
\ir 005_create_photos_table.sql

\echo '📋 Étape 6/12: Création table partage...'
\ir 006_create_partage_table.sql

\echo '⚡ Étape 7/12: Création index de performance...'
\ir 007_create_indexes.sql

\echo '🔐 Étape 8/12: Activation Row Level Security...'
\ir 008_enable_rls.sql

\echo '🔐 Étape 9/12: Policies RLS voyages...'
\ir 009_create_rls_policies_voyages.sql

\echo '🔐 Étape 10/12: Policies RLS evenements...'
\ir 010_create_rls_policies_evenements.sql

\echo '🔐 Étape 11/12: Policies RLS tables restantes...'
\ir 011_create_rls_policies_remaining.sql

\echo '⚙️  Étape 12/12: Fonctions utilitaires...'
\ir 012_create_functions.sql

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ Déploiement terminé avec succès!'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo '📊 Vérification:'
SELECT 
  'voyages' as table_name, 
  COUNT(*) as row_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'voyages'
UNION ALL
SELECT 'evenements', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evenements'
UNION ALL
SELECT 'depenses', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'depenses'
UNION ALL
SELECT 'checklist', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist'
UNION ALL
SELECT 'photos', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'photos'
UNION ALL
SELECT 'partage', COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partage';

\echo ''
\echo '📝 Prochaines étapes:'
\echo '1. Créer le bucket Storage "voyage-photos"'
\echo '2. Configurer les policies du bucket'
\echo '3. Tester l''application'
\echo ''
