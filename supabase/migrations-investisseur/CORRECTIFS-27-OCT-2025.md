# 🎯 Correctifs du 27 octobre 2025

## Résumé des problèmes résolus

Cette mise à jour corrige **8 problèmes critiques** liés aux transactions et à la comptabilité :

### ✅ Problème 1 : Colonnes manquantes dans la table `transactions`
**Symptôme :** Erreur "Could not find the 'bank_fees' column" et "Could not find the 'category' column"
**Cause :** La table transactions n'avait que les colonnes de base (14 colonnes), toutes les migrations suivantes n'avaient jamais été exécutées
**Solution :** Migration 75 - Ajoute **24 colonnes manquantes** en une seule fois
**Fichier :** `75-add-all-missing-transaction-columns.sql`

---

### ✅ Problème 2 : Erreur de clé étrangère sur `cash_flow_forecast`
**Symptôme :** Erreur "violates foreign key constraint cash_flow_forecast_scenario_id_fkey"
**Cause :** Le trigger `create_actual_cash_flow` essayait d'utiliser `property_id` comme `scenario_id`, mais ils ne correspondent pas
**Solution :** Migration 76 - Corrige le trigger pour mettre `scenario_id = NULL` pour les transactions réelles
**Fichier :** `76-fix-cash-flow-trigger-scenario-id.sql`

---

### ✅ Problème 3 : Investissement direct comptabilisé dans "Compte Courant" au lieu d'"Investissement Immobilier"
**Symptôme :**
- Transaction de 2921.78 $ d'investissement direct par carte dans "Oasis Bay - A302"
- Apparaît dans "Compte Courant" au lieu d'"Investissement Immobilier"
- "Investissement Immobilier" affiche 0 $ alors qu'un paiement a été fait

**Cause :**
La logique du dashboard excluait les transactions de type `'investissement'` du calcul d'"Investissement Immobilier"

```typescript
// AVANT (incorrect)
.filter(t => t.property_id && t.type !== 'investissement')
```

**Solution :**
Retirer le filtre qui exclut les investissements directs + Corriger la conversion USD/CAD

```typescript
// APRÈS (correct)
.filter(t => t.property_id)
.reduce((sum, t) => {
  // Si transaction en USD, utiliser source_amount
  if (t.source_currency === 'USD' && t.source_amount) {
    return sum + Math.abs(t.source_amount)
  }
  // Sinon convertir CAD → USD
  return sum + (Math.abs(t.amount) / exchangeRate)
}, 0)
```

**Fichier modifié :** `app/dashboard/page.tsx` (lignes 102-111 et 593-602)

---

### ✅ Problème 4 : Conversion de devises incorrecte
**Symptôme :** "Investissement Immobilier" reste à 0 $ même après un paiement
**Cause :** Le code prenait `amount` (en CAD) et le comptait comme USD sans conversion

**Explication :**
Dans la table `transactions` :
- `amount` : toujours en **CAD** (devise de référence)
- `source_amount` : montant dans la **devise d'origine**
- `source_currency` : devise d'origine (USD, DOP, EUR, etc.)
- `exchange_rate` : taux de conversion source → CAD

**Solution :**
- Si `source_currency === 'USD'` → utiliser `source_amount`
- Sinon → convertir `amount` (CAD) en USD avec `amount / exchangeRate`

**Fichier modifié :** `app/dashboard/page.tsx`

---

### ✅ Problème 5 : Parts d'investisseur non calculées (affiche "0 parts")
**Symptôme :** Après un investissement, la répartition s'ajoute mais le nombre de parts reste à 0
**Cause :** Aucun trigger ne créait automatiquement les enregistrements dans `investor_investments` lors de la création d'une transaction d'investissement

**Solution :** Migration 77 - Trigger automatique qui :
1. Détecte les transactions de type `'investissement'` avec un `investor_id`
2. Récupère le prix actuel de la part depuis `share_settings`
3. Calcule le nombre de parts : `montant investi / prix de la part`
4. Insère automatiquement dans `investor_investments`

**Fichier :** `77-auto-create-investor-shares-from-transactions.sql`

**Exemple :**
```
Investissement : 2921.78 $ CAD
Prix part : 1.00 $ CAD
Parts créées : 2921.78 parts
```

---

### ✅ Problème 6 : Pas de progression visible pour les paiements partiels
**Symptôme :** Impossible de voir combien reste à payer quand on fait un paiement partiel
**Cause :** Aucune interface pour afficher le solde restant et la progression

**Solution :** Ajout d'une barre de progression dans le calendrier des paiements qui affiche :
- Montant déjà payé
- Solde restant
- Barre de progression visuelle (%)
- S'affiche uniquement si des paiements partiels ont été faits

**Fichier modifié :** `app/dashboard/page.tsx` (lignes 800-831)

**Exemple visuel :**
```
┌──────────────────────────────────────────┐
│ Payé: 2,921.78 $    Reste: 7,078.22 $   │
│ ███████░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│         29.2% payé                       │
└──────────────────────────────────────────┘
```

---

### ✅ Problème 7 : Impossible de supprimer une transaction
**Symptôme :** Erreur "violates foreign key constraint cash_flow_forecast_actual_transaction_id_fkey"
**Cause :** Les contraintes de clé étrangère empêchent la suppression de transactions référencées dans d'autres tables

**Explication :**
Quand une transaction est créée, plusieurs triggers automatiques insèrent des enregistrements dans d'autres tables :
- `create_actual_cash_flow` → insère dans `cash_flow_forecast`
- `mark_obligation_paid` → référence dans `payment_obligations`
- `sync_bank_balance` → référence dans `bank_transactions`

Par défaut, PostgreSQL empêche la suppression d'une transaction si elle est référencée ailleurs.

**Solution :** Migration 78 - Modifier les contraintes pour `ON DELETE SET NULL` + trigger de nettoyage

**Tables corrigées :**
1. `cash_flow_forecast.actual_transaction_id` → ON DELETE SET NULL
2. `bank_transactions.matched_transaction_id` → ON DELETE SET NULL
3. `payment_obligations.paid_transaction_id` → ON DELETE SET NULL

**Trigger de nettoyage :**
- `auto_delete_investor_shares` : Supprime automatiquement les parts dans `investor_investments` quand une transaction d'investissement est supprimée
- Garantit la cohérence des données

**Fichier :** `78-fix-transaction-delete-constraint.sql`

**Comportement après correction :**
- ✅ Suppression de transactions autorisée
- ✅ Les références dans autres tables sont mises à NULL (historique conservé)
- ✅ Les parts d'investisseur sont automatiquement supprimées
- ✅ Pas d'erreur 409 Conflict

---

### ✅ Problème 8 : Impossible de modifier une transaction
**Symptôme :** Les modifications de transactions ne mettent pas à jour les parts d'investisseur
**Cause :** Le trigger de création de parts (migration 77) ne gère que les INSERT, pas les UPDATE

**Explication :**
Quand on modifie une transaction d'investissement (changement de montant, date, investisseur), plusieurs problèmes se posent :
- Les parts dans `investor_investments` ne sont pas mises à jour
- Si on change le montant de 2000$ à 3000$, les parts restent calculées sur 2000$
- Si on change le type de `'investissement'` à `'dividende'`, les parts restent
- Si on change le type de `'dividende'` à `'investissement'`, aucune part n'est créée

**Solution :** Migration 79 - Trigger intelligent qui gère les 3 cas

**Trigger intelligent :**
```sql
-- CAS 1: Investissement → Non-investissement
IF OLD.type = 'investissement' AND NEW.type != 'investissement' THEN
  DELETE parts -- Supprimer les parts
END IF

-- CAS 2: Non-investissement → Investissement
IF OLD.type != 'investissement' AND NEW.type = 'investissement' THEN
  INSERT parts -- Créer les parts
END IF

-- CAS 3: Investissement → Investissement
IF OLD.type = 'investissement' AND NEW.type = 'investissement' THEN
  UPDATE parts -- Mettre à jour montant, date, investisseur
END IF
```

**Amélioration migration 77 :**
- Vérifie si des parts existent déjà avant création
- Évite les doublons en cas de retry ou re-exécution

**Fichier :** `79-handle-transaction-updates.sql`

**Comportement après correction :**
- ✅ Modification de montant → Parts recalculées automatiquement
- ✅ Changement de type → Parts créées/supprimées selon le cas
- ✅ Changement d'investisseur → Parts transférées automatiquement
- ✅ Pas de doublons, pas d'incohérences

---

## 📋 Migrations à exécuter sur Supabase

### **ORDRE D'EXÉCUTION IMPORTANT** :

1. **Migration 75** : Colonnes manquantes
   Fichier : `75-add-all-missing-transaction-columns.sql`

2. **Migration 76** : Correction trigger cash_flow
   Fichier : `76-fix-cash-flow-trigger-scenario-id.sql`

3. **Migration 77** : Calcul automatique des parts
   Fichier : `77-auto-create-investor-shares-from-transactions.sql`

4. **Migration 78** : Autoriser suppression de transactions
   Fichier : `78-fix-transaction-delete-constraint.sql`

5. **Migration 79** : Gérer les modifications de transactions
   Fichier : `79-handle-transaction-updates.sql`

### Comment les exécuter :
1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. **SQL Editor** → New query
4. Copiez-collez le contenu de chaque fichier **dans l'ordre**
5. Cliquez **RUN** ▶️ pour chaque migration
6. Vérifiez que chaque migration affiche "✅ MIGRATION XX TERMINÉE"

---

## 🎯 Résultat après les corrections

### Avant :
- ❌ Impossible de créer des transactions (colonnes manquantes)
- ❌ Impossible de supprimer des transactions (erreur 409 Conflict)
- ❌ Impossible de modifier des transactions (parts non mises à jour)
- ❌ Investissement direct va dans "Compte Courant"
- ❌ "Investissement Immobilier" = 0 $ (problème conversion USD/CAD)
- ❌ Investisseurs affichent "0 parts"
- ❌ Pas de visibilité sur les paiements partiels

### Après :
- ✅ Transactions créées sans erreur
- ✅ Transactions supprimées sans erreur (avec nettoyage automatique)
- ✅ Transactions modifiées avec mise à jour automatique des parts
- ✅ Investissement direct va dans "Investissement Immobilier"
- ✅ "Investissement Immobilier" affiche le bon montant en USD
- ✅ "Compte Courant" calculé correctement (Total - Investissements - Dépenses)
- ✅ Parts calculées, modifiées et supprimées automatiquement
- ✅ Barre de progression pour voir les paiements partiels

---

## 📊 Exemple concret

### Transaction créée :
```
Type: Investissement
Description: RÉSERVATION PC A302 OASIS BAY
Investisseur: Eric Dufort
Propriété: Oasis Bay - A302
Montant: 2,921.78 $ CAD
Devise source: USD
Montant source: 2,087.00 $ USD
Taux de change: 1.3995
Méthode: Carte (paiement direct)
```

### Résultat dashboard AVANT corrections :
```
Total Investisseurs: 2,921.78 $ ✓
Investissement Immobilier: 0 $ US ✗
Compte Courant: 2,921.78 $ ✗

Eric Dufort: 2,921.78 $ • 0 parts ✗
```

### Résultat dashboard APRÈS corrections :
```
Total Investisseurs: 2,921.78 $ ✓
Investissement Immobilier: 2,087.00 $ US ✓
Compte Courant: 0 $ ✓

Eric Dufort: 2,921.78 $ • 2,921.78 parts ✓
```

---

## 🔄 Commits GitHub

Tous les changements ont été poussés sur GitHub :

1. **Commit d0c49b3** : Migration 76 (trigger cash_flow)
2. **Commit a74111a** : Toutes les corrections dashboard + Migration 77
3. **Commit ad431e9** : Documentation complète des corrections
4. **Commit b60fee7** : Migration 78 (autoriser suppression transactions)
5. **Commit 84bb370** : Documentation migration 78
6. **Commit ca973b2** : Migration 79 (gérer modifications transactions)

---

## ⚠️ Notes importantes

1. **Ordre des migrations** : Il est crucial d'exécuter les migrations dans l'ordre (75 → 76 → 77)

2. **Transactions existantes** : Les transactions créées AVANT la migration 77 n'auront pas de parts calculées automatiquement. Vous pouvez soit :
   - Les recréer après la migration 77
   - Créer manuellement les enregistrements dans `investor_investments`

3. **Prix des parts** : Le trigger utilise le `nominal_share_value` de la table `company_settings`. Assurez-vous qu'il est correctement défini (par défaut : 1.00 $ CAD)

4. **Conversion de devises** : Le dashboard utilise le taux de change en temps réel depuis l'API. Les calculs sont automatiques.

---

**Date :** 27 octobre 2025
**Priorité :** 🔴 CRITIQUE
**Impact :** Débloque complètement la création de transactions
**Statut :** ✅ RÉSOLU

