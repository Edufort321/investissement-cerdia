# 🚀 Quick Start - Installation Supabase

## 📦 Contenu

Toutes les migrations SQL sont dans: `supabase/migrations/`

**14 fichiers de migration** créés et prêts à déployer:

```
001_create_voyages_table.sql        → Table principale
002_create_evenements_table.sql     → Timeline (vols, hébergements)
003_create_depenses_table.sql       → Suivi financier
004_create_checklist_table.sql      → Tâches à faire
005_create_photos_table.sql         → Métadonnées photos
006_create_partage_table.sql        → Partage "Me Suivre"
007_create_indexes.sql              → Performance
008_enable_rls.sql                  → Sécurité RLS
009_create_rls_policies_voyages.sql → Policies voyages
010_create_rls_policies_evenements.sql → Policies événements
011_create_rls_policies_remaining.sql → Policies autres
012_create_functions.sql            → Fonctions utiles
013_create_storage_bucket.sql       → Fonction vérification bucket
014_create_voyage_photos_policies.sql → Policies Storage (AUTO)
```

## ⚡ Installation (5 minutes)

### Méthode 1: Dashboard Supabase (Recommandé)

1. **Ouvrir Supabase**
   ```
   https://app.supabase.com
   → Sélectionnez votre projet
   → SQL Editor
   ```

2. **Exécuter les migrations**

   Pour chaque fichier (001 → 014):
   - Nouvelle query
   - Copiez-collez le contenu
   - Cliquez RUN ▶️

   ⚠️ **IMPORTANT:** Exécutez la migration **014** APRÈS avoir exécuté le script **47** (voir étape suivante)

3. **Créer TOUS les buckets Storage (AUTOMATIQUE via SQL) ⚡**

   Les buckets se créent automatiquement avec le script **47** :

   ```
   SQL Editor → New query
   → Copiez-collez: supabase/47-create-all-storage-buckets.sql
   → RUN ▶️
   ```

   Cela créera 5 buckets dont **voyage-photos** pour Mon Voyage!

   ℹ️ Si vous voulez vérifier que voyage-photos existe :
   ```sql
   SELECT * FROM public.check_voyage_photos_bucket();
   ```

4. **✅ Les policies sont créées automatiquement!**

   La migration **014** crée automatiquement toutes les policies pour le bucket voyage-photos:
   - ✅ INSERT - Upload de photos
   - ✅ SELECT - Téléchargement
   - ✅ UPDATE - Modification métadonnées
   - ✅ DELETE - Suppression

   🔒 **Sécurité:** Chaque utilisateur accède uniquement à SES propres photos!

   Vérification:
   ```sql
   SELECT * FROM public.check_voyage_photos_policies();
   ```

### Méthode 2: Fichier consolidé

Utilisez `SUPABASE_SCHEMA.sql` (racine du projet):
- Un seul fichier avec toutes les migrations
- Plus rapide mais moins modulaire

### Méthode 3: Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter au projet
supabase link --project-ref YOUR_PROJECT_REF

# Déployer toutes les migrations
cd supabase
supabase db push
```

## ✅ Vérification

Après installation, exécutez dans SQL Editor:

```sql
-- Vérifier les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('voyages', 'evenements', 'depenses', 'checklist', 'photos', 'partage');

-- Résultat attendu: 6 lignes
```

## 🎯 Prêt!

L'application peut maintenant:
- ✅ Créer/modifier/supprimer des voyages
- ✅ Gérer événements, dépenses, checklist
- ✅ Uploader des photos
- ✅ Partager des voyages
- ✅ Respecter les modes (investor/single/full)

## 📚 Documentation complète

- **README.md** → Guide complet
- **MANIFEST.md** → Liste des fichiers
- **INTEGRATION_VOYAGES_MULTIPLES.md** → Intégration app

## 🆘 Besoin d'aide?

Consultez: [Supabase Docs](https://supabase.com/docs)

---

**Temps estimé:** 5 minutes  
**Difficulté:** ⭐ Facile
