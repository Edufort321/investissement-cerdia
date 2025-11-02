# 🚨 IMPORTANT : Migrations Supabase à Appliquer

## Problème actuel

**Vos événements et checklist ne restent pas en mémoire** parce que les tables de base de données n'existent pas encore dans votre instance Supabase.

## Solution : Appliquer les migrations SQL

Vous devez exécuter **20 migrations SQL** dans votre base de données Supabase pour créer toutes les tables nécessaires.

---

## Option 1 : Fichier Combiné (RECOMMANDÉ - Plus Rapide) ⚡

Utilisez le fichier qui contient toutes les migrations en une seule fois :

### Étapes :

1. **Ouvrez votre projet Supabase** → https://supabase.com/dashboard
2. Allez dans **SQL Editor** (icône de base de données dans la barre latérale)
3. Cliquez sur **+ New Query**
4. **Copiez TOUT le contenu** du fichier `_ALL_MIGRATIONS_COMBINED.sql`
5. **Collez** dans l'éditeur SQL
6. Cliquez sur **Run** (ou Ctrl+Enter)

✅ C'est tout! Toutes les 20 migrations seront appliquées en une seule fois.

---

## Option 2 : Migrations Individuelles (Si Option 1 échoue)

Appliquez les migrations une par une dans l'ordre :

```sql
001_create_voyages_table.sql
002_create_evenements_table.sql
003_create_depenses_table.sql
004_create_checklist_table.sql
005_create_photos_table.sql
006_create_partage_table.sql
007_create_indexes.sql
008_enable_rls.sql
009_create_rls_policies_voyages.sql
010_create_rls_policies_evenements.sql
011_create_rls_policies_remaining.sql
012_create_functions.sql
013_create_storage_bucket.sql
014_create_voyage_photos_policies.sql
015_add_public_and_privacy_features.sql
016_fix_rls_infinite_recursion.sql
017_force_clean_all_rls_policies.sql
018_add_event_details_and_locations.sql
019_create_event_waypoints.sql        ← NOUVELLE
020_add_external_link_to_events.sql   ← NOUVELLE
```

---

## Option 3 : CLI Supabase (Avancé)

Si vous avez le CLI Supabase installé :

```bash
cd supabase/migrations-voyages
supabase db push
```

---

## Vérification

Après avoir appliqué les migrations, vérifiez dans **Table Editor** que vous avez ces tables :

- ✅ `voyages`
- ✅ `evenements`
- ✅ `depenses`
- ✅ `checklist`
- ✅ `photos`
- ✅ `partage`
- ✅ `event_waypoints` (nouvelle)

---

## Que font ces migrations ?

### Migrations de base (001-012)
- Créent les tables principales (voyages, événements, dépenses, checklist, photos, partage)
- Configurent les index pour les performances
- Activent Row Level Security (RLS)
- Créent les politiques de sécurité
- Créent les fonctions utilitaires

### Migrations avancées (013-018)
- Configurent le stockage de fichiers
- Ajoutent les fonctionnalités de partage public
- Corrigent les problèmes de RLS
- Ajoutent les détails d'événements (coordonnées GPS, transport, etc.)

### Nouvelles migrations (019-020)
- **019**: Table `event_waypoints` pour les étapes/points d'intérêt lors d'activités
- **020**: Colonne `external_link` pour les liens externes (réservations, billetterie)

---

## Après l'application

Une fois les migrations appliquées :

1. 🎉 **Vos événements seront sauvegardés** dans Supabase
2. 🎉 **Votre checklist restera en mémoire**
3. 🎉 **Vous pourrez ajouter des waypoints** aux activités
4. 🎉 **Vous pourrez ajouter des liens externes** aux événements

---

## Besoin d'aide ?

Si vous rencontrez des erreurs :

1. Vérifiez que vous êtes dans le bon projet Supabase
2. Assurez-vous que votre projet a les permissions nécessaires
3. Consultez les logs d'erreur dans l'éditeur SQL
4. Contactez le support si nécessaire

---

**Date de mise à jour**: 2 novembre 2025
**Nombre total de migrations**: 20
