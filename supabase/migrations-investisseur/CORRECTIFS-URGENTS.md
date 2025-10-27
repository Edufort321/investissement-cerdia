# 🚨 Correctifs Urgents - Migrations à exécuter

## Problème actuel
Impossible d'enregistrer des transactions. Erreur :
```
Could not find the 'bank_fees' column of 'transactions' in the schema cache
```

## Solution : Exécuter 2 migrations

### 1️⃣ Migration 018 : Statut paiement complet/partiel

**Fichier:** `018_add_payment_completion_status.sql`

**Ce qu'elle fait:**
- Ajoute colonne `payment_completion_status` dans `transactions`
- Modifie le trigger `auto_mark_payment_as_paid`
- Permet de choisir si un paiement est complet ou partiel

**Exécution:**
1. Allez sur https://app.supabase.com
2. SQL Editor → New query
3. Copiez-collez le contenu de `018_add_payment_completion_status.sql`
4. Cliquez **RUN** ▶️

---

### 2️⃣ Migration 074 : Colonne bank_fees manquante

**Fichier:** `74-add-missing-bank-fees-column.sql`

**Ce qu'elle fait:**
- Ajoute colonne `bank_fees` dans `transactions`
- Cette colonne est nécessaire pour enregistrer les frais bancaires
- **CRITIQUE** : Sans cette colonne, impossible d'enregistrer des transactions

**Exécution:**
1. SQL Editor → New query
2. Copiez-collez le contenu de `74-add-missing-bank-fees-column.sql`
3. Cliquez **RUN** ▶️

---

## ✅ Vérification

Après avoir exécuté les 2 migrations, vérifiez dans le SQL Editor :

```sql
-- Vérifier que bank_fees existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name IN ('bank_fees', 'payment_completion_status');
```

Vous devriez voir :
```
column_name                 | data_type | column_default
----------------------------|-----------|----------------
bank_fees                   | numeric   | 0
payment_completion_status   | text      | NULL
```

## 🎯 Test

Essayez de créer une transaction dans l'interface.
Cela devrait maintenant fonctionner ! ✅

---

**Date:** 27 octobre 2025
**Priorité:** 🔴 CRITIQUE
**Impact:** Bloque la création de transactions
