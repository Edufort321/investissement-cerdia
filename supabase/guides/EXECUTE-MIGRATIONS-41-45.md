# Guide d'exécution des migrations 41 à 45

Ce guide explique comment exécuter les migrations SQL nécessaires pour activer les nouvelles fonctionnalités.

## 📋 Migrations à exécuter

Vous devez exécuter **5 scripts SQL** dans l'ordre suivant via l'éditeur SQL de Supabase:

### 1. Script 41: Types d'investissement finaux
**Fichier**: `supabase/41-final-investment-types.sql`

Ce script finalise les types d'investissement acceptés par la plateforme.

### 2. Script 42: Correction des politiques RLS pour scénarios
**Fichier**: `supabase/42-fix-scenarios-rls-policies.sql`

Ce script corrige les politiques de sécurité Row-Level Security (RLS) pour permettre aux investisseurs de créer et modifier des scénarios.

### 3. Script 43: Ajout du statut "pending_transfer"
**Fichier**: `supabase/43-add-pending-transfer-status.sql`

**Fonctionnalité importante**:
- Ajoute le statut "En attente de transfert" après l'approbation par vote
- Automatise le changement de statut quand la majorité des investisseurs ont voté
- Crée un trigger qui calcule automatiquement le résultat du vote

**Workflow de vote**:
1. `pending_vote` → Scénario soumis au vote
2. Quand >50% des investisseurs votent → `pending_transfer` (approuvé) ou `rejected`
3. Admin finalise le transfert → `approved`

### 4. Script 44: Option de déduction d'acompte du premier terme
**Fichier**: `supabase/44-add-deduct-initial-from-first-term.sql`

Ajoute la colonne `deduct_initial_from_first_term` permettant de déduire automatiquement l'acompte initial du premier terme de paiement.

**Exemple**:
- Prix: 178,000$
- Acompte initial: 2,000$
- Premier terme (20%): 35,600$ - 2,000$ = **33,600$**

### 5. Script 45: Photo principale des propriétés
**Fichier**: `supabase/45-add-main-photo-to-properties.sql`

Ajoute la colonne `main_photo_url` à la table `properties` pour transférer automatiquement la photo principale du scénario lors de la conversion en projet.

---

## 🚀 Instructions d'exécution

### Étape 1: Accéder à Supabase SQL Editor

1. Connectez-vous à [https://supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **SQL Editor**

### Étape 2: Exécuter les scripts

Pour chaque script (dans l'ordre 41 → 42 → 43 → 44 → 45):

1. Ouvrez le fichier SQL dans votre éditeur de code
2. **Copiez** tout le contenu du fichier
3. Dans Supabase SQL Editor, créez une **nouvelle requête**
4. **Collez** le contenu du script
5. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter / Cmd+Enter)
6. Attendez le message de confirmation: `MIGRATION XX TERMINEE`

### Étape 3: Vérification

Après avoir exécuté tous les scripts, vérifiez que:

✅ Aucune erreur n'est apparue lors de l'exécution
✅ Chaque script affiche son message de confirmation
✅ Les 5 messages "MIGRATION XX TERMINEE" sont visibles

---

## 🧪 Test après migration

Une fois les scripts exécutés, testez les fonctionnalités:

### Test 1: Créer un scénario avec photo
1. Allez dans l'onglet **Scénarios**
2. Créez un nouveau scénario (ex: "Oasis Bay A301")
3. Ajoutez une **photo principale**
4. Définissez les **frais de transaction** (pourcentage ou montant fixe)
5. Activez l'option **"Déduire l'acompte du premier terme"** si souhaité
6. Sauvegardez le scénario

### Test 2: Workflow de vote
1. Soumettez le scénario au vote
2. Votez avec différents investisseurs
3. Vérifiez que le statut passe à **"pending_transfer"** quand >50% ont voté
4. (Admin) Forcez l'approbation si nécessaire

### Test 3: Conversion en projet
1. Convertissez le scénario approuvé en projet
2. Vérifiez que:
   - ✅ La **photo principale** est transférée
   - ✅ Les **termes de paiement** sont créés dans `payment_schedules`
   - ✅ Le **total_cost** inclut les frais de transaction
   - ✅ L'**acompte** est déduit du premier terme si l'option était activée

---

## ⚠️ Dépannage

### Erreur: "relation already exists"
**Cause**: Le script a déjà été exécuté
**Solution**: Passez au script suivant, c'est normal

### Erreur: "permission denied"
**Cause**: Vous n'avez pas les droits d'administration
**Solution**: Connectez-vous avec un compte admin Supabase

### Erreur: "constraint already exists"
**Cause**: Une contrainte existe déjà avec ce nom
**Solution**: Le script gère ce cas avec `IF EXISTS`, vous pouvez ignorer

---

## 📝 Notes importantes

- **Ordre d'exécution**: Respectez l'ordre 41 → 42 → 43 → 44 → 45
- **Backup**: Les scripts utilisent `IF EXISTS` et `IF NOT EXISTS` pour éviter les erreurs
- **Réversibilité**: Aucune donnée existante n'est supprimée
- **Production**: Ces scripts peuvent être exécutés en production sans risque

---

## ✅ Checklist finale

Après exécution complète:

- [ ] Script 41 exécuté avec succès
- [ ] Script 42 exécuté avec succès
- [ ] Script 43 exécuté avec succès
- [ ] Script 44 exécuté avec succès
- [ ] Script 45 exécuté avec succès
- [ ] Test de création de scénario avec photo réussi
- [ ] Test de conversion en projet réussi
- [ ] Photo transférée correctement
- [ ] Termes de paiement créés

---

**Date de création**: 2025-01-24
**Version**: 1.0
**Auteur**: System Migration
