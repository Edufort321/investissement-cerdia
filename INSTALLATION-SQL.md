# 🚀 Guide d'Installation des Scripts SQL Supabase

## 📋 Scripts à Exécuter (dans l'ordre)

Tous les scripts sont dans le dossier `supabase/` et doivent être exécutés **dans cet ordre exact**.

---

## ✅ Étapes d'Installation

### 1. Accéder au SQL Editor Supabase

1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet `investissement-cerdia`
3. Clique sur **SQL Editor** dans le menu gauche
4. Clique sur **New Query**

---

### 2. Exécuter les Scripts SQL (Ordre Important)

#### Script 1: `8-add-currency-support.sql` ✅
**Déjà exécuté précédemment**
- Support multi-devises (CAD/USD)
- Table exchange_rates
- Vue transaction_summary

---

#### Script 2: `9-add-payment-schedules.sql` 🆕
**Nouveau - À EXÉCUTER**

**Ce qu'il fait:**
- ✅ Ajoute colonnes pour devise et paiements échelonnés aux `properties`
- ✅ Crée table `payment_schedules` pour suivre chaque terme
- ✅ Fonction `generate_payment_schedule()` pour créer calendriers
- ✅ Fonction `get_property_payment_summary()` pour résumés
- ✅ Vue `upcoming_payments` pour les alertes
- ✅ Triggers automatiques pour statuts `overdue`
- ✅ **Support acompte de réservation**
- ✅ **Montant réel payé en CAD** avec taux de change

**Copie le fichier:** `supabase/9-add-payment-schedules.sql`

**Résultat attendu:**
```
✅ SYSTÈME DE PAIEMENTS ÉCHELONNÉS CRÉÉ
Tables: properties (updated), payment_schedules (new)
```

---

#### Script 3: `10-add-compte-courant.sql` 🆕
**Nouveau - À EXÉCUTER**

**Ce qu'il fait:**
- ✅ Ajoute colonnes auto-catégorisation aux `transactions`
- ✅ Crée table `current_accounts` pour regroupement mensuel
- ✅ **Auto-catégorisation intelligente** (3 types: revenus, coûts opération, dépenses projet)
- ✅ **Association automatique aux projets**
- ✅ Fonction `auto_categorize_transaction()`
- ✅ Fonction `update_current_account_for_month()`
- ✅ Vue `current_account_by_project`
- ✅ Triggers pour mise à jour temps réel

**Copie le fichier:** `supabase/10-add-compte-courant.sql`

**Résultat attendu:**
```
✅ SYSTÈME DE COMPTE COURANT CRÉÉ
Tables: transactions (updated), current_accounts (new)
Triggers: Auto-catégorisation + Mise à jour compte courant
```

---

#### Script 4: `11-add-investment-history.sql` 🆕
**Nouveau - À EXÉCUTER**

**Ce qu'il fait:**
- ✅ Crée table `investment_lines` pour historique ligne par ligne
- ✅ **Fonction `quick_create_investor()`** pour création rapide depuis compte courant
- ✅ **Fonction `create_investment_line_from_transaction()`** pour intégration automatique
- ✅ **Fonction `update_investor_totals_from_lines()`** pour synchro automatique
- ✅ Vue `investment_history` pour historique complet
- ✅ Vue `investor_investment_summary` pour résumés
- ✅ Triggers pour mise à jour automatique des totaux
- ✅ RLS policies pour sécurité

**Copie le fichier:** `supabase/11-add-investment-history.sql`

**Résultat attendu:**
```
✅ SYSTÈME D'HISTORIQUE DES INVESTISSEMENTS CRÉÉ
Table: investment_lines
Fonctions: create_investment_line_from_transaction, update_investor_totals_from_lines, quick_create_investor
```

---

## 🎯 Vérification Post-Installation

Après avoir exécuté tous les scripts, exécute cette requête pour vérifier:

```sql
-- Vérifier les tables créées
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'payment_schedules',
    'current_accounts',
    'investment_lines'
  )
ORDER BY table_name;
```

**Résultat attendu: 3 lignes**
- `current_accounts`
- `investment_lines`
- `payment_schedules`

---

```sql
-- Vérifier les fonctions créées
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_payment_schedule',
    'get_property_payment_summary',
    'auto_categorize_transaction',
    'update_current_account_for_month',
    'quick_create_investor',
    'create_investment_line_from_transaction',
    'update_investor_totals_from_lines'
  )
ORDER BY routine_name;
```

**Résultat attendu: 7 fonctions**

---

```sql
-- Vérifier les vues créées
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'upcoming_payments',
    'current_account_by_project',
    'investment_history',
    'investor_investment_summary'
  )
ORDER BY table_name;
```

**Résultat attendu: 4 vues**

---

## 📖 Guide Rapide d'Utilisation

### A. Paiements Échelonnés

#### Créer un calendrier de paiements (50/20/20/10):
```sql
SELECT * FROM generate_payment_schedule(
  'property-uuid',
  'fixed_terms',
  150000.00,
  'USD',
  '2025-01-01',
  '[
    {"label": "Acompte", "percentage": 50, "days_offset": 0},
    {"label": "2e versement", "percentage": 20, "days_offset": 30},
    {"label": "3e versement", "percentage": 20, "days_offset": 60},
    {"label": "Versement final", "percentage": 10, "days_offset": 90}
  ]'::JSONB
);
```

#### Marquer un paiement comme payé avec montant CAD:
```sql
UPDATE payment_schedules
SET
  status = 'paid',
  paid_date = '2025-01-15',
  amount_paid_cad = 101250.00,
  exchange_rate_used = 1.35
WHERE id = 'payment-uuid';
```

#### Voir les paiements à venir/en retard:
```sql
SELECT * FROM upcoming_payments
WHERE alert_status IN ('alert', 'overdue');
```

---

### B. Compte Courant

#### Voir le compte du mois en cours:
```sql
SELECT * FROM current_accounts
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND month = EXTRACT(MONTH FROM CURRENT_DATE);
```

#### Voir le compte par projet:
```sql
SELECT * FROM current_account_by_project
WHERE year = 2025 AND month = 1;
```

#### Catégoriser manuellement une transaction:
```sql
UPDATE transactions
SET
  operation_type = 'cout_operation',
  project_category = 'utilities',
  auto_categorized = FALSE
WHERE id = 'transaction-uuid';
```

---

### C. Historique Investissements

#### Créer rapidement un nouvel investisseur:
```sql
SELECT quick_create_investor(
  'Jean',
  'Dupont',
  'jean@example.com',
  'A',
  1000.00
);
-- Retourne l'UUID du nouvel investisseur
```

#### Ajouter une ligne d'investissement depuis une transaction:
```sql
SELECT create_investment_line_from_transaction(
  'transaction-uuid',
  'investor-uuid',
  50000.00,
  'CAD',
  'A',
  1000.00
);
-- Les totaux de l'investisseur se mettent à jour automatiquement!
```

#### Voir l'historique complet d'un investisseur:
```sql
SELECT * FROM investment_history
WHERE investor_id = 'investor-uuid'
ORDER BY date DESC;
```

#### Voir le résumé de tous les investisseurs:
```sql
SELECT * FROM investor_investment_summary;
```

---

## ⚠️ Important - Ordre d'Exécution

**RESPECTER CET ORDRE:**
1. ✅ Script 8 (déjà fait)
2. 🆕 Script 9 - Paiements échelonnés
3. 🆕 Script 10 - Compte courant
4. 🆕 Script 11 - Historique investissements

**Pourquoi?**
- Le script 10 dépend des colonnes créées par le script 8
- Le script 11 utilise des fonctions du script 10
- Les triggers s'ajoutent progressivement

---

## 🔄 En cas d'Erreur

Si tu obtiens une erreur lors de l'exécution:

1. **Vérifier si la table/fonction existe déjà:**
   ```sql
   SELECT * FROM information_schema.tables
   WHERE table_name = 'nom_de_la_table';
   ```

2. **Supprimer et recréer (si nécessaire):**
   ```sql
   DROP TABLE IF EXISTS nom_table CASCADE;
   -- Puis réexécuter le script
   ```

3. **Vérifier les dépendances:**
   - Assure-toi que tous les scripts précédents ont été exécutés
   - Vérifie qu'il n'y a pas de typo dans les UUID

---

## 📞 Support

Les fichiers SQL complets sont dans:
- `supabase/9-add-payment-schedules.sql`
- `supabase/10-add-compte-courant.sql`
- `supabase/11-add-investment-history.sql`

Guides détaillés:
- `GUIDE-PAIEMENTS-COMPTE-COURANT.md`

---

## ✅ Checklist

- [ ] Script 9 exécuté - Paiements échelonnés
- [ ] Script 10 exécuté - Compte courant
- [ ] Script 11 exécuté - Historique investissements
- [ ] Vérification des 3 tables créées
- [ ] Vérification des 7 fonctions créées
- [ ] Vérification des 4 vues créées
- [ ] Test: Créer un investisseur rapidement
- [ ] Test: Créer un calendrier de paiements
- [ ] Test: Voir le compte courant du mois

**Une fois tous les scripts exécutés, l'application sera prête pour les nouvelles fonctionnalités UI!**
