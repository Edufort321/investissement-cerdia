# 🚨 Correctifs Urgents - Migrations à exécuter

## Problème actuel
Impossible d'enregistrer des transactions. Erreurs multiples :
```
Could not find the 'bank_fees' column of 'transactions' in the schema cache
Could not find the 'category' column of 'transactions' in the schema cache
```

**Cause:** La table `transactions` dans Supabase n'a que les colonnes de base.
Toutes les migrations ultérieures (12, 15, 018, 70, 74) n'ont pas été exécutées.

## Solution : Exécuter 1 migration complète

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

**Date:** 27 octobre 2025
**Priorité:** 🔴 CRITIQUE
**Impact:** Bloque la création de transactions
**Solution:** Migration 075 (complète et définitive)
