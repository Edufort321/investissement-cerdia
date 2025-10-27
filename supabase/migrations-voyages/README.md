# Migrations - Application Mes Voyages

Ce dossier contient toutes les migrations SQL pour l'application **Mes Voyages**.

## Structure de l'application

### Tables principales
- `voyages` - Voyages et itinéraires
- `evenements` - Événements du voyage
- `depenses` - Dépenses du voyage
- `checklist` - Liste de choses à faire
- `photos` - Photos du voyage
- `partage` - Partage de localisation

## Ordre d'exécution

Les migrations doivent être exécutées dans l'ordre numérique :

### 1. Création des tables (001-006)
- `001_create_voyages_table.sql` - Table des voyages
- `002_create_evenements_table.sql` - Table des événements
- `003_create_depenses_table.sql` - Table des dépenses
- `004_create_checklist_table.sql` - Table checklist
- `005_create_photos_table.sql` - Table photos
- `006_create_partage_table.sql` - Table partage de localisation

### 2. Configuration (007-008)
- `007_create_indexes.sql` - Index pour performance
- `008_enable_rls.sql` - Activation de la sécurité RLS

### 3. Politiques RLS (009-011)
- `009_create_rls_policies_voyages.sql` - Politiques RLS pour voyages
- `010_create_rls_policies_evenements.sql` - Politiques RLS pour événements
- `011_create_rls_policies_remaining.sql` - Politiques RLS autres tables

### 4. Fonctions (012)
- `012_create_functions.sql` - Fonctions SQL utilitaires

### 5. Storage (013-014)
- `013_create_storage_bucket.sql` - Bucket de stockage photos
- `014_create_voyage_photos_policies.sql` - Politiques storage photos

### 6. Fonctionnalités avancées (015-017)
- `015_add_public_and_privacy_features.sql` - Fonctionnalités de confidentialité
- `016_fix_rls_infinite_recursion.sql` - Correction récursion RLS
- `017_force_clean_all_rls_policies.sql` - Nettoyage politiques RLS

## Commandes d'exécution

### Via Supabase CLI
```bash
cd migrations-voyages
supabase db push
```

### Manuellement
Exécuter chaque fichier dans l'ordre dans le SQL Editor de Supabase :

```sql
-- 1. Créer les tables
\i 001_create_voyages_table.sql
\i 002_create_evenements_table.sql
-- etc...
```

## Notes importantes

⚠️ **ATTENTION** : Ces migrations sont pour l'application **Mes Voyages** uniquement.
Pour les migrations de l'application **Investissement**, voir le dossier `migrations-investisseur/`.

## Architecture

L'application Mes Voyages permet de :
- 📍 Créer et gérer des voyages
- 📅 Planifier des événements
- 💰 Suivre les dépenses
- ✅ Gérer une checklist
- 📸 Partager des photos
- 🗺️ Partager sa localisation en temps réel

## Sécurité

Toutes les tables utilisent Row Level Security (RLS) pour garantir que :
- Les utilisateurs ne voient que leurs propres voyages
- Le partage public est contrôlé par l'utilisateur
- Les photos sont accessibles via des URLs sécurisées

## Support

Pour toute question, consulter la documentation principale dans `/supabase/README.md`
