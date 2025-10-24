# Fix: Erreur "Bucket not found" lors de l'upload de photos

## 🔴 Problème

Lors de l'upload d'une photo dans un scénario, l'erreur suivante apparaît:

```
StorageApiError: Bucket not found
```

## ✅ Solution

Le bucket `scenario-documents` n'existe pas dans Supabase Storage. Tu dois l'exécuter les scripts SQL suivants dans l'ordre:

---

## 📝 Étape 1: Créer le bucket

**Fichier**: `supabase/46-create-scenario-documents-bucket.sql`

Ce script va:
- Créer le bucket `scenario-documents` (privé)
- Configurer la limite de taille à 50 MB par fichier
- Autoriser les types de fichiers: images (JPEG, PNG, GIF, WebP), PDF, Excel, Word, PowerPoint

**Exécution**:
1. Va sur [supabase.com](https://supabase.com) → ton projet → **SQL Editor**
2. Copie le contenu de `46-create-scenario-documents-bucket.sql`
3. Colle et **exécute** (Run)
4. Vérifie le message: `MIGRATION 46 TERMINEE - Bucket scenario-documents créé`

---

## 📝 Étape 2: Configurer les policies de sécurité

**Fichier**: `supabase/21-scenario-storage-policies.sql`

Ce script va créer les politiques RLS (Row Level Security) pour:
- Upload (INSERT): Utilisateurs authentifiés peuvent uploader
- View (SELECT): Utilisateurs authentifiés peuvent voir
- Delete (DELETE): Utilisateurs authentifiés peuvent supprimer
- Update (UPDATE): Utilisateurs authentifiés peuvent modifier

**Exécution**:
1. Dans **SQL Editor**
2. Copie le contenu de `21-scenario-storage-policies.sql`
3. Colle et **exécute** (Run)
4. Vérifie le message de confirmation

---

## 🧪 Test

Après avoir exécuté les 2 scripts:

1. **Rafraîchis la page** de l'application (F5)
2. **Crée ou modifie un scénario**
3. **Upload une photo principale**
4. ✅ L'upload devrait fonctionner sans erreur

---

## 🔍 Vérification dans Supabase Dashboard

Pour vérifier que le bucket existe:

1. Va sur **Supabase Dashboard** → ton projet
2. Menu de gauche → **Storage**
3. Tu devrais voir le bucket **scenario-documents**
4. Clique dessus → tu devrais voir les fichiers uploadés (organisés par ID de scénario)

---

## 📂 Structure des fichiers

Les fichiers sont organisés ainsi dans le bucket:

```
scenario-documents/
  ├── {scenario-id-1}/
  │   ├── main-photo-1234567890.jpg
  │   ├── brochure.pdf
  │   └── plan-financier.xlsx
  └── {scenario-id-2}/
      ├── main-photo-9876543210.jpg
      └── contrat.pdf
```

---

## ⚠️ Dépannage

### Erreur: "duplicate key value violates unique constraint"

**Cause**: Le bucket existe déjà

**Solution**: Normal, le script gère ce cas avec `ON CONFLICT DO UPDATE`

### Erreur: "permission denied for table buckets"

**Cause**: Tu n'as pas les droits d'administration

**Solution**: Connecte-toi avec un compte admin Supabase

### L'upload fonctionne mais les fichiers ne s'affichent pas

**Cause**: Problème de policies RLS

**Solution**: Réexécute le script 21 (policies)

---

**Date**: 2025-01-24
**Version**: 1.0
