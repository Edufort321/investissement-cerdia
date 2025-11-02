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

### 7. Nouveaux champs (018)
- `018_add_event_details_and_locations.sql` - Adresses, GPS, transport détaillé

## 🚀 Commandes d'exécution

### ⚠️ IMPORTANT: Votre checklist/dépenses ne persistent pas?

Si vos données de checklist ou dépenses ne se sauvegardent pas, c'est que **les migrations ne sont pas appliquées à votre base Supabase**!

### Option 1: Via l'interface Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** (icône </> dans la sidebar gauche)
4. Pour chaque migration **dans l'ordre 001 → 018**:
   ```
   a) Ouvrez le fichier .sql localement
   b) Copiez TOUT le contenu
   c) Collez dans SQL Editor Supabase
   d) Cliquez "Run" (ou Ctrl+Enter)
   e) Vérifiez qu'il n'y a pas d'erreur en rouge
   ```

### Option 2: Copier-coller toutes les migrations d'un coup

```bash
# Depuis le dossier migrations-voyages, créer un fichier combiné:
cat 001_create_voyages_table.sql \
    002_create_evenements_table.sql \
    003_create_depenses_table.sql \
    004_create_checklist_table.sql \
    005_create_photos_table.sql \
    006_create_partage_table.sql \
    007_create_indexes.sql \
    008_enable_rls.sql \
    009_create_rls_policies_voyages.sql \
    010_create_rls_policies_evenements.sql \
    011_create_rls_policies_remaining.sql \
    012_create_functions.sql \
    013_create_storage_bucket.sql \
    014_create_voyage_photos_policies.sql \
    015_add_public_and_privacy_features.sql \
    016_fix_rls_infinite_recursion.sql \
    017_force_clean_all_rls_policies.sql \
    018_add_event_details_and_locations.sql \
    > ALL_MIGRATIONS.sql

# Puis copier/coller ALL_MIGRATIONS.sql dans SQL Editor Supabase
```

### Option 3: Via Supabase CLI (Avancé)

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref VOTRE_PROJECT_REF

# Appliquer toutes les migrations
cd supabase/migrations-voyages
for file in *.sql; do
  echo "Applying $file..."
  supabase db execute --file "$file"
done
```

## ✅ Vérifier que les migrations sont appliquées

Après avoir exécuté les migrations, vérifiez dans Supabase Dashboard:

### 1. Tables créées
**Database** → **Tables** → Vous devriez voir:
- ✅ `voyages`
- ✅ `evenements`
- ✅ `depenses` ← **CRITIQUE pour dépenses**
- ✅ `checklist` ← **CRITIQUE pour to-do list**
- ✅ `photos`
- ✅ `partage`

### 2. Politiques RLS actives
**Database** → **Policies** → Chaque table doit avoir 4 politiques:
- `Users can view ...` (SELECT)
- `Users can create ...` (INSERT)
- `Users can update ...` (UPDATE)
- `Users can delete ...` (DELETE)

### 3. Test rapide
Essayez dans SQL Editor:
```sql
-- Vérifier que la table checklist existe
SELECT * FROM checklist LIMIT 1;

-- Vérifier que la table depenses existe
SELECT * FROM depenses LIMIT 1;

-- Vérifier les politiques RLS
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('checklist', 'depenses')
ORDER BY tablename, policyname;
```

## 🐛 Problèmes courants

### "Ma checklist ne se sauvegarde pas / disparaît au refresh"
➡️ **Solution**: Les tables `checklist` et `depenses` n'existent pas encore dans votre Supabase!
1. Exécutez `003_create_depenses_table.sql`
2. Exécutez `004_create_checklist_table.sql`
3. Exécutez `011_create_rls_policies_remaining.sql` (politiques RLS)

### "Erreur: relation 'checklist' does not exist"
➡️ **Solution**: La table n'a pas été créée. Exécutez `004_create_checklist_table.sql` dans SQL Editor.

### "Erreur: new row violates row-level security policy"
➡️ **Solution**: Les politiques RLS ne sont pas configurées.
1. Exécutez `008_enable_rls.sql` pour activer RLS
2. Exécutez `011_create_rls_policies_remaining.sql` pour les politiques

### "Les événements se sauvegardent mais pas la checklist"
➡️ **Solution**: Migration partielle. Exécutez **toutes** les migrations 001-018 dans l'ordre.

### "Comment savoir si mes migrations sont appliquées?"
➡️ Allez dans Supabase Dashboard → Database → Tables. Vous devriez voir 6 tables (voyages, evenements, depenses, checklist, photos, partage).

## 📝 Notes importantes

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
