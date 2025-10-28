# 🚨 Correctifs Urgents - Migrations à exécuter

> **📄 Documentation complète** : Voir [CORRECTIFS-27-OCT-2025.md](./CORRECTIFS-27-OCT-2025.md) pour un résumé détaillé de tous les problèmes résolus

---

## Problème 1: Colonnes manquantes ✅ RÉSOLU
~~Impossible d'enregistrer des transactions. Erreurs multiples~~
**Statut:** ✅ Résolu avec migration 75

## Problème 2: Erreur Foreign Key sur cash_flow_forecast 🔴 ACTUEL
Erreur lors de l'enregistrement d'une transaction :
```
insert or update on table "cash_flow_forecast" violates foreign key constraint "cash_flow_forecast_scenario_id_fkey"
POST /rest/v1/transactions 409 (Conflict)
```

**Cause:** Le trigger `create_actual_cash_flow` essaie d'utiliser `property_id` comme `scenario_id`, mais `property_id` n'existe pas dans la table `scenarios`.

## Solution : Exécuter 2 migrations

### ✅ Migration 075 : TOUTES les colonnes manquantes (COMPLET)

**Fichier:** `75-add-all-missing-transaction-columns.sql`

**Ce qu'elle fait:**
Cette migration ajoute **TOUTES** les colonnes manquantes dans la table `transactions` :

**Colonnes de base:**
- `category` - Catégorie (capital, operation, maintenance, admin)
- `payment_method` - Méthode de paiement (virement, cheque, especes, carte)
- `reference_number` - Numéro de référence
- `status` - Statut (complete, en_attente, annule)

**Fiscalité internationale:**
- `source_currency` - Devise source (USD, DOP, EUR, etc.)
- `source_amount` - Montant dans devise source
- `exchange_rate` - Taux de change
- `source_country` - Pays d'origine
- `bank_fees` - Frais bancaires ⭐
- `foreign_tax_paid` - Impôts étrangers payés
- `foreign_tax_rate` - Taux d'imposition étranger
- `tax_credit_claimable` - Crédit d'impôt réclamable
- `fiscal_category` - Catégorie fiscale
- `vendor_name` - Nom du fournisseur
- `accountant_notes` - Notes comptables

**Paiements programmés:**
- `payment_schedule_id` - Lien vers paiement programmé
- `payment_completion_status` - Complet ou partiel

**Pièces jointes:**
- `attachment_name`, `attachment_url`, `attachment_storage_path`
- `attachment_mime_type`, `attachment_size`, `attachment_uploaded_at`

**Exécution:**
1. Allez sur https://app.supabase.com
2. SQL Editor → New query
3. Copiez-collez le contenu de `75-add-all-missing-transaction-columns.sql`
4. Cliquez **RUN** ▶️

**Cette migration inclut une vérification automatique !**
Si tout est bon, vous verrez :
```
✅ Toutes les colonnes requises sont présentes dans la table transactions
```

---

## ✅ Vérification

La migration 075 inclut une vérification automatique. Si elle s'exécute sans erreur,
c'est que toutes les colonnes sont ajoutées correctement !

Vous pouvez aussi vérifier manuellement :

```sql
-- Compter les colonnes de transactions
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'transactions';
```

Vous devriez avoir **environ 35-40 colonnes** (au lieu de ~14 initialement)

## 🎯 Test

Essayez de créer une transaction dans l'interface.
Cela devrait maintenant fonctionner ! ✅

---

## 📝 Note importante

Si vous avez déjà exécuté les migrations 018 et 074, la migration 075 va simplement
ajouter les colonnes manquantes sans erreur (grâce à `IF NOT EXISTS`).

### ✅ Migration 076 : Correction trigger cash_flow_forecast (CRITIQUE) 🆕

**Fichier:** `76-fix-cash-flow-trigger-scenario-id.sql`

**Ce qu'elle fait:**
Corrige le trigger automatique `create_actual_cash_flow_from_transaction()` qui s'exécute à chaque création de transaction.

**Le problème:**
- Le trigger insère automatiquement un enregistrement dans `cash_flow_forecast`
- Il essayait d'utiliser `NEW.property_id` comme `scenario_id`
- Mais `scenario_id` a une contrainte de clé étrangère vers la table `scenarios`
- Le `property_id` n'existe pas dans `scenarios` → erreur !

**La solution:**
- Met `scenario_id` à `NULL` pour les transactions réelles
- Les transactions réelles ne font pas partie d'un scénario de prévision

**Exécution:**
1. Allez sur https://app.supabase.com
2. SQL Editor → New query
3. Copiez-collez le contenu de `76-fix-cash-flow-trigger-scenario-id.sql`
4. Cliquez **RUN** ▶️

**Résultat attendu:**
```
✅ Trigger create_actual_cash_flow mis à jour avec succès
```

Après cette migration, vous pourrez créer des transactions sans erreur de clé étrangère ! ✅

### ✅ Migration 077 : Calcul automatique des parts d'investisseur 🆕

**Fichier:** `77-auto-create-investor-shares-from-transactions.sql`

**Ce qu'elle fait:**
Crée un trigger automatique qui calcule et enregistre les parts d'investisseur quand une transaction d'investissement est créée.

**Le problème:**
- Quand on crée une transaction d'investissement, les parts ne sont pas calculées
- Les investisseurs affichent "0 parts" même après avoir investi
- La table `investor_investments` reste vide

**La solution:**
- Trigger qui s'exécute automatiquement à chaque transaction de type `'investissement'`
- Récupère le prix actuel de la part depuis `share_settings`
- Calcule : `nombre de parts = montant investi / prix de la part`
- Insère automatiquement dans `investor_investments`

**Exemple:**
```
Investissement: 2,921.78 $ CAD
Prix de la part: 1.00 $ CAD
Parts créées: 2,921.78 parts ✓
```

**Exécution:**
1. Allez sur https://app.supabase.com
2. SQL Editor → New query
3. Copiez-collez le contenu de `77-auto-create-investor-shares-from-transactions.sql`
4. Cliquez **RUN** ▶️

**Résultat attendu:**
```
✅ Trigger auto_create_investor_shares créé avec succès
```

Après cette migration, les parts seront calculées automatiquement ! ✅

---

**Date:** 27 octobre 2025
**Priorité:** 🔴 CRITIQUE
**Impact:** Bloque la création de transactions + Calcul des parts + Affichage comptable
**Solution:** Migrations 075 + 076 + 077 (complète et définitive)
