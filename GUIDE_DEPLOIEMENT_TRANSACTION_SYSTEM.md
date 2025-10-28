# 🚀 GUIDE DE DÉPLOIEMENT - SYSTÈME DE TRANSACTIONS ET DETTES

**Date:** 28 janvier 2025
**Migration:** 90 + 91
**Objectif:** Corriger le système de transactions et ajouter la gestion des dettes investisseurs

---

## 📋 RÉSUMÉ DES PROBLÈMES CORRIGÉS

### ✅ Problèmes identifiés et résolus

1. **Modification de transactions** : Les modifications ne se sauvegardaient pas ❌ → ✅ Corrigé
2. **Suppression de transactions** : Les parts n'étaient pas retirées du profil investisseur ❌ → ✅ Corrigé
3. **Doublons dans investor_investments** : Création en double des parts ❌ → ✅ Corrigé + Script de nettoyage
4. **Gestion flux +/-** : Difficile de gérer les entrées/sorties ❌ → ✅ UI améliorée
5. **Source de paiement** : Impossible de savoir qui paie ❌ → ✅ Nouveau système ajouté
6. **Gestion des dettes** : Aucune gestion des dettes investisseurs ❌ → ✅ Système complet ajouté

---

## 🆕 NOUVELLES FONCTIONNALITÉS

### 1. Source du paiement

Chaque transaction peut maintenant indiquer **qui paie** :

| Source | Description | Impact compte courant |
|--------|-------------|----------------------|
| **Compte courant** 🏢 | La société paie directement | ✅ Oui |
| **Investisseur direct** 👤 | L'investisseur paie lui-même | ❓ Dépend du type |

### 2. Type de paiement investisseur direct

Si l'investisseur paie directement, préciser :

| Type | Description | Crée des parts | Crée une dette | Affecte compte courant |
|------|-------------|----------------|----------------|----------------------|
| **Achat de parts** 💵 | L'investisseur achète directement des parts | ✅ Oui | ❌ Non | ❌ Non |
| **Dette à rembourser** 📝 | L'investisseur avance l'argent temporairement | ❌ Non | ✅ Oui | ❌ Non (maintenant), ✅ Oui (au remboursement) |

### 3. Gestion des dettes

- ✅ Nouvelle table `investor_debts` pour tracker les dettes
- ✅ Vue `investor_debts_summary` pour résumé par investisseur
- ✅ Flag automatique dans le profil investisseur (à implémenter dans l'UI)
- ✅ Flux de remboursement des dettes (à implémenter dans l'UI)

### 4. Recalcul automatique des totaux

- ✅ Triggers automatiques après INSERT/UPDATE/DELETE dans `investor_investments`
- ✅ Fonction `recalculate_investor_totals(investor_id)` pour recalcul manuel
- ✅ Fonction `recalculate_all_investors()` pour recalcul global

---

## 📦 FICHIERS CRÉÉS/MODIFIÉS

### Nouveaux fichiers créés

```
supabase/migrations-investisseur/
├── 90-complete-transaction-and-debt-system.sql   ← Migration principale
└── 91-cleanup-and-recalculate.sql                ← Script de nettoyage

components/admin/
├── TransactionModalV2.tsx                         ← Nouveau modal amélioré
└── TransactionModal.backup.tsx                    ← Backup de l'ancien

types/
└── investment.ts                                   ← Types mis à jour (Transaction, InvestorDebt)
```

### Fichiers à modifier (prochaines étapes)

- `components/AdministrationTab.tsx` : Utiliser TransactionModalV2
- `components/InvestorProfile.tsx` : Afficher les dettes
- `components/DebtRepaymentModal.tsx` : À créer (remboursement)

---

## 🔧 ÉTAPES DE DÉPLOIEMENT

### ÉTAPE 1: Exécuter la migration principale

**Dans l'éditeur SQL de Supabase :**

```sql
-- Copier/coller le contenu de :
-- supabase/migrations-investisseur/90-complete-transaction-and-debt-system.sql

-- Ou via CLI :
-- psql -U postgres -d cerdia -f supabase/migrations-investisseur/90-complete-transaction-and-debt-system.sql
```

**✅ Vérification :**
- Pas d'erreur SQL
- Messages `✅ Migration 90 terminée avec succès`

---

### ÉTAPE 2: Nettoyer les doublons et recalculer

**Dans l'éditeur SQL de Supabase :**

```sql
-- Copier/coller le contenu de :
-- supabase/migrations-investisseur/91-cleanup-and-recalculate.sql

-- Ce script va :
-- 1. Afficher l'état AVANT correction
-- 2. Nettoyer les doublons
-- 3. Recalculer tous les totaux
-- 4. Afficher l'état APRÈS correction
```

**✅ Vérification :**
- Regarder les tableaux de comparaison AVANT/APRÈS
- Vérifier que tous les investisseurs ont le statut `✅ OK`
- Si `❌ INCOHÉRENT`, noter l'investisseur et investiguer

**Exemple de résultat attendu :**

```
📊 État actuel APRÈS correction:
╔══════════════╦════════════════╦═══════════════╦════════════════╗
║ Investisseur ║ Parts (Profil) ║ Parts (Invst) ║ Statut         ║
╠══════════════╬════════════════╬═══════════════╬════════════════╣
║ Chad         ║ 100000         ║ 100000        ║ ✅ OK          ║
║ Jean         ║ 50000          ║ 50000         ║ ✅ OK          ║
╚══════════════╩════════════════╩═══════════════╩════════════════╝
```

---

### ÉTAPE 3: Tester manuellement les fonctions SQL

**Dans l'éditeur SQL de Supabase :**

```sql
-- 1. Recalculer un investisseur spécifique
SELECT recalculate_investor_totals('UUID-DE-L-INVESTISSEUR');

-- 2. Voir le résumé des dettes
SELECT * FROM investor_debts_summary;

-- 3. Recalculer TOUS les investisseurs (si besoin)
SELECT * FROM recalculate_all_investors();

-- 4. Vérifier qu'il n'y a plus de doublons
SELECT
  investor_id,
  investment_date::date,
  amount_invested,
  COUNT(*) AS nombre_doublons
FROM investor_investments
GROUP BY investor_id, investment_date::date, amount_invested
HAVING COUNT(*) > 1;
-- Résultat attendu : 0 lignes
```

---

### ÉTAPE 4: Mettre à jour l'interface (React/Next.js)

#### 4.1 Remplacer le TransactionModal

**Option A - Remplacement direct (recommandé) :**

```bash
# Backup actuel déjà fait automatiquement
# Remplacer l'ancien par le nouveau
mv components/admin/TransactionModalV2.tsx components/admin/TransactionModal.tsx
```

**Option B - Test progressif :**

Modifier `components/AdministrationTab.tsx` :

```tsx
// Ligne 1 - Remplacer l'import
- import TransactionModal from './admin/TransactionModal'
+ import TransactionModal from './admin/TransactionModalV2'
```

#### 4.2 Mettre à jour la fonction onSave

Dans `components/AdministrationTab.tsx`, trouver `handleTransactionSubmit` (ligne ~600) :

**Avant (problème - pas d'ID) :**
```tsx
if (editingTransactionId) {
  const result = await updateTransaction(editingTransactionId, dataToSubmit)
  // ...
}
```

**Après (corrigé) :**
```tsx
// TransactionModalV2 passe maintenant l'ID dans dataToSubmit
if (dataToSubmit.id) {
  const result = await updateTransaction(dataToSubmit.id, dataToSubmit)
  if (result.success) {
    // ...
  }
} else {
  const result = await addTransaction(dataToSubmit)
  // ...
}
```

---

### ÉTAPE 5: Vérifier les types TypeScript

Les types ont déjà été mis à jour dans `types/investment.ts` avec :

- `Transaction` : Nouveaux champs `payment_source`, `investor_payment_type`, `affects_compte_courant`
- `InvestorDebt` : Nouvelle interface complète
- `Investor` : Nouveaux champs `debts`, `total_debt`, `has_active_debt`

**✅ Vérification :**

```bash
# Vérifier qu'il n'y a pas d'erreurs TypeScript
npm run type-check
# ou
npx tsc --noEmit
```

---

### ÉTAPE 6: Redémarrer le serveur de développement

```bash
# Arrêter le serveur actuel (Ctrl+C)
# Redémarrer
npm run dev
```

---

### ÉTAPE 7: Tester l'interface

#### Test 1: Créer une nouvelle transaction (Compte courant)

1. Aller dans **Dashboard → Administration → Transactions**
2. Cliquer **Nouvelle transaction**
3. Sélectionner **ENTRÉE D'ARGENT** (+)
4. Catégorie : **Investissement**
5. Source paiement : **COMPTE COURANT** 🏢
6. Montant : 5000 CAD
7. Investisseur : Choisir un investisseur
8. Description : "Test investissement compte courant"
9. **Créer la transaction**

**✅ Vérification :**
- Transaction créée avec succès
- Parts créées automatiquement dans le profil investisseur
- `total_shares` et `total_invested` mis à jour automatiquement

#### Test 2: Créer une transaction (Investisseur direct - Achat de parts)

1. Nouvelle transaction
2. Sélectionner **SORTIE D'ARGENT** (-)
3. Catégorie : **Achat propriété**
4. Source paiement : **INVESTISSEUR DIRECT** 👤
5. Type : **ACHAT DE PARTS** 💵
6. Investisseur : Choisir un investisseur
7. Montant : 10000 CAD
8. Description : "Achat direct propriété XYZ"
9. **Créer la transaction**

**✅ Vérification :**
- Transaction créée
- Parts créées pour l'investisseur
- **Compte courant NON affecté** (affects_compte_courant = false)

#### Test 3: Créer une transaction (Investisseur direct - Dette)

1. Nouvelle transaction
2. Sélectionner **SORTIE D'ARGENT** (-)
3. Catégorie : **Admin** (frais avocat)
4. Source paiement : **INVESTISSEUR DIRECT** 👤
5. Type : **DETTE À REMBOURSER** 📝
6. Investisseur : Choisir un investisseur
7. Montant : 2000 CAD
8. Description : "Frais avocat payés par investisseur"
9. **Créer la transaction**

**✅ Vérification :**
- Transaction créée
- **Dette créée** dans table `investor_debts`
- Vérifier avec SQL :
  ```sql
  SELECT * FROM investor_debts WHERE status = 'active';
  ```
- **Compte courant NON affecté** (pour l'instant)
- **Parts NON créées** (c'est une dette, pas un investissement)

#### Test 4: Modifier une transaction existante

1. Cliquer sur **Modifier** sur une transaction
2. Changer le montant (ex: 5000 → 7500)
3. Cliquer **Mettre à jour**

**✅ Vérification :**
- Transaction modifiée avec succès
- Si c'est un investissement, les parts sont recalculées automatiquement
- `total_shares` mis à jour dans le profil investisseur

#### Test 5: Supprimer une transaction

1. Cliquer sur **Supprimer** sur une transaction d'investissement
2. Confirmer la suppression

**✅ Vérification :**
- Transaction supprimée
- Parts retirées automatiquement du profil investisseur
- `total_shares` et `total_invested` mis à jour automatiquement

---

### ÉTAPE 8: Vérifier la cohérence des données

**Dans l'éditeur SQL de Supabase :**

```sql
-- Vérifier cohérence entre profils investisseurs et leurs investissements
SELECT
  i.id,
  i.first_name || ' ' || i.last_name AS investisseur,
  i.total_shares AS parts_profile,
  COALESCE(SUM(ii.shares_purchased), 0) AS parts_investissements,
  i.total_invested AS investi_profile,
  COALESCE(SUM(ii.amount_invested), 0) AS investi_investissements,
  CASE
    WHEN ABS(i.total_shares - COALESCE(SUM(ii.shares_purchased), 0)) < 0.01
      AND ABS(i.total_invested - COALESCE(SUM(ii.amount_invested), 0)) < 0.01
    THEN '✅ OK'
    ELSE '❌ INCOHÉRENT'
  END AS statut
FROM investors i
LEFT JOIN investor_investments ii ON i.id = ii.investor_id AND ii.status = 'active'
GROUP BY i.id, i.first_name, i.last_name, i.total_shares, i.total_invested
ORDER BY i.first_name, i.last_name;
```

**Résultat attendu :** Tous les investisseurs avec statut `✅ OK`

---

## 🔜 PROCHAINES ÉTAPES (À IMPLÉMENTER)

### 1. Affichage des dettes dans le profil investisseur

**Composant à créer :** `components/InvestorDebtBadge.tsx`

```tsx
// Afficher un badge rouge si l'investisseur a des dettes actives
{investor.has_active_debt && (
  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
    ⚠️  Dette: {investor.total_debt} CAD
  </span>
)}
```

### 2. Flux de remboursement des dettes

**Composant à créer :** `components/admin/DebtRepaymentModal.tsx`

**Fonctionnalités :**
- Afficher toutes les dettes actives d'un investisseur
- Permettre de rembourser :
  - Totalement (amount_paid = amount)
  - Partiellement (amount_paid += paiement_partiel)
- Créer automatiquement une transaction de type `remboursement_investisseur`
- Mettre à jour le statut de la dette (`active` → `partial` → `paid`)
- **Retirer du compte courant** au moment du remboursement

### 3. Dashboard des dettes

**Page à créer :** `app/dashboard/debts`

**Afficher :**
- Liste de tous les investisseurs avec dettes actives
- Total des dettes par investisseur
- Bouton "Rembourser" pour chaque dette
- Historique des remboursements

---

## 🐛 DÉPANNAGE

### Problème : Doublons persistent après nettoyage

**Solution :**
```sql
-- Réexécuter le nettoyage
SELECT * FROM clean_duplicate_investments();

-- Vérifier manuellement
SELECT * FROM investor_investments
WHERE investor_id = 'UUID'
ORDER BY created_at;

-- Si doublons persistent, supprimer manuellement
DELETE FROM investor_investments WHERE id = 'UUID-DU-DOUBLON';

-- Recalculer
SELECT recalculate_investor_totals('UUID-INVESTISSEUR');
```

### Problème : Parts ne se mettent pas à jour après modification

**Solution :**
```sql
-- Vérifier que le trigger est actif
SELECT * FROM pg_trigger
WHERE tgname LIKE '%investor%';

-- Recalculer manuellement
SELECT recalculate_all_investors();
```

### Problème : Erreur "payment_source column does not exist"

**Cause :** Migration 90 pas exécutée

**Solution :**
```bash
# Réexécuter la migration
psql -U postgres -d cerdia -f supabase/migrations-investisseur/90-complete-transaction-and-debt-system.sql
```

### Problème : TypeScript erreurs après mise à jour

**Solution :**
```bash
# Nettoyer le cache Next.js
rm -rf .next

# Réinstaller les dépendances
npm install

# Redémarrer
npm run dev
```

---

## 📞 SUPPORT

**En cas de problème :**
1. Vérifier les logs SQL dans Supabase (Dashboard → Logs)
2. Vérifier les logs console du navigateur (F12 → Console)
3. Vérifier l'état des triggers :
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%transaction%';
   ```
4. Contacter le support technique avec :
   - Captures d'écran du problème
   - Logs d'erreur SQL
   - État de la base de données (résultat de la requête de cohérence)

---

## ✅ CHECKLIST DE DÉPLOIEMENT

- [ ] Migration 90 exécutée sans erreur
- [ ] Script 91 exécuté (nettoyage et recalcul)
- [ ] Vérification SQL : Aucun doublon restant
- [ ] Vérification SQL : Tous investisseurs avec statut ✅ OK
- [ ] TransactionModalV2 installé et importé
- [ ] Types TypeScript mis à jour
- [ ] `npm run type-check` sans erreur
- [ ] Serveur redémarré (`npm run dev`)
- [ ] Test 1 : Création transaction compte courant ✅
- [ ] Test 2 : Création transaction investisseur direct (achat parts) ✅
- [ ] Test 3 : Création transaction investisseur direct (dette) ✅
- [ ] Test 4 : Modification transaction ✅
- [ ] Test 5 : Suppression transaction ✅
- [ ] Vérification finale cohérence SQL ✅

**🎉 Déploiement terminé avec succès !**

---

## 📊 SCHÉMA DU NOUVEAU SYSTÈME

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRANSACTION                              │
├─────────────────────────────────────────────────────────────────┤
│ • date, amount, type, description                               │
│ • payment_source: "compte_courant" | "investisseur_direct"     │
│ • investor_payment_type: "achat_parts" | "dette_a_rembourser"  │
│ • affects_compte_courant: boolean                               │
└─────────────────────────────────────────────────────────────────┘
                               ↓
                ┌──────────────┴───────────────┐
                │                              │
       [compte_courant]               [investisseur_direct]
                │                              │
                ↓                     ┌────────┴────────┐
        ✅ Affecte                    │                 │
    Compte Courant           [achat_parts]    [dette_a_rembourser]
                                     │                 │
                                     ↓                 ↓
                            ✅ Crée parts      ✅ Crée dette
                            ❌ Pas dette       ❌ Pas parts
                            ❌ Pas CC          ❌ Pas CC (maintenant)
                                               ✅ CC (au remboursement)
```

**Légende :**
- ✅ = Action effectuée
- ❌ = Action NON effectuée
- CC = Compte Courant

---

**FIN DU GUIDE**
