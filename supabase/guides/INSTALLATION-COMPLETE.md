# 🚀 GUIDE D'INSTALLATION COMPLET - Base de données CERDIA

## 📋 Vue d'ensemble

Ce guide vous accompagne dans l'installation complète de la base de données Supabase pour la plateforme CERDIA Investment.

**Durée estimée:** 15-20 minutes
**Prérequis:** Compte Supabase actif

---

## 📁 SCRIPTS SQL DISPONIBLES

### 🔵 Scripts de Base (Obligatoires)

| # | Fichier | Description | Durée |
|---|---------|-------------|-------|
| 1 | `1-cleanup.sql` | Nettoie la base de données | 5s |
| 2 | `2-create-tables.sql` | Crée les 11 tables principales | 10s |
| 3 | `3-create-indexes.sql` | Ajoute les index de performance | 5s |
| 4 | `4-create-triggers.sql` | Crée triggers et fonctions | 5s |
| 5 | `5-enable-rls.sql` | Active Row Level Security | 5s |
| 6 | `6-insert-data.sql` | Insère données de test | 5s |
| 7 | `7-storage-policies.sql` | Configure bucket "documents" | 5s |

### 🟢 Scripts d'Extension (Recommandés)

| # | Fichier | Description | Dépendances |
|---|---------|-------------|-------------|
| 8 | `8-add-currency-support.sql` | Support multi-devises (USD, CAD, DOP, EUR) | 2 |
| 9 | `9-add-payment-schedules.sql` | Calendriers de paiement échelonnés | 2, 8 |
| 10 | `10-add-compte-courant-SIMPLIFIE.sql` | Comptes courants (CAPEX, R&D) | 2 |
| 11 | `11-add-property-attachments.sql` | Pièces jointes projets | 2 |
| 12 | `12-add-international-tax-fields.sql` | Champs fiscalité (T1135, T2209) | 2, 8 |
| 13 | `13-add-roi-performance-tracking.sql` | Suivi performance ROI | 2 |
| 14 | `14-enhance-payment-schedules.sql` | Amélioration calendriers paiement | 9 |
| 15 | `15-link-payments-to-transactions.sql` | Lien paiements↔transactions | 2, 9 |
| 16 | `16-add-transaction-fees-and-effective-rate.sql` | Frais et taux effectif | 2, 8 |
| 17 | `17-setup-storage-policies.sql` | Policies pour buckets storage | - |
| 18 | `18-create-investor-investments.sql` | Système de parts investisseurs | 2 |
| 19 | `19-create-company-settings.sql` | Paramètres globaux entreprise | - |

### 🔴 Scripts Utilitaires

| # | Fichier | Description | Usage |
|---|---------|-------------|-------|
| 99 | `99-reset-all-data.sql` | Vide toutes les données (garde structure) | Debug uniquement |

---

## 🎯 PROCÉDURE D'INSTALLATION

### Étape 0: Préparation

1. **Ouvrir Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet CERDIA
   - Cliquez sur **SQL Editor** dans le menu gauche

2. **Créer les buckets Storage manuellement**

   Avant d'exécuter les scripts, créez ces 3 buckets dans **Storage**:

   | Nom | Type | Limite |
   |-----|------|--------|
   | `documents` | Public | 50 MB |
   | `transaction-attachments` | Privé | 50 MB |
   | `property-attachments` | Privé | 50 MB |

   📖 **Guide détaillé:** Voir `SETUP-STORAGE.md`

---

### ✅ INSTALLATION RAPIDE (Recommandée)

Pour une installation complète avec toutes les fonctionnalités :

```
Exécutez les scripts dans l'ordre suivant (tous obligatoires):

✅ Scripts 1-7   → Base de données
✅ Scripts 8-19  → Toutes les fonctionnalités
```

#### Procédure :

1. **Pour chaque script** (1 à 19) :
   - Cliquez **+ New Query** dans SQL Editor
   - Ouvrez le fichier `.sql` correspondant
   - Copiez **TOUT** le contenu
   - Collez dans l'éditeur SQL
   - Cliquez **RUN** (ou Ctrl+Enter)
   - Attendez le message de confirmation ✅

2. **Temps total:** ~10-15 minutes

---

### 🎓 INSTALLATION PROGRESSIVE (Apprentissage)

Pour comprendre chaque étape, suivez cette séquence :

#### Phase 1: Base de données (Scripts 1-7)

**Script 1: Nettoyage**
```sql
-- Exécutez: 1-cleanup.sql
```
✅ Résultat attendu: `NETTOYAGE TERMINÉ`

**Script 2: Tables principales**
```sql
-- Exécutez: 2-create-tables.sql
```
✅ Résultat attendu: `11 TABLES CRÉÉES`

**Vérification:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Vous devriez voir :
- `capex_accounts`
- `current_accounts`
- `dividend_allocations`
- `dividends`
- `documents`
- `investors`
- `operational_expenses`
- `properties`
- `reports`
- `rnd_accounts`
- `transactions`

**Script 3: Index**
```sql
-- Exécutez: 3-create-indexes.sql
```
✅ Résultat attendu: `INDEXES CRÉÉS`

**Script 4: Triggers**
```sql
-- Exécutez: 4-create-triggers.sql
```
✅ Résultat attendu: `TRIGGERS ET FONCTIONS CRÉÉS`

**Script 5: Sécurité RLS**
```sql
-- Exécutez: 5-enable-rls.sql
```
✅ Résultat attendu: `RLS ACTIVÉ`

**Script 6: Données de test**
```sql
-- Exécutez: 6-insert-data.sql
```
✅ Résultat attendu: `DONNÉES INSÉRÉES - BASE DE DONNÉES COMPLÈTE!`

**Vérification des données:**
```sql
-- Voir les investisseurs
SELECT first_name, last_name, total_invested, percentage_ownership
FROM investors
ORDER BY total_invested DESC;

-- Résultat attendu: 4 investisseurs (Éric, Chad, Alexandre, Pierre)
```

**Script 7: Storage**
```sql
-- Exécutez: 7-storage-policies.sql
```
✅ Résultat attendu: `STORAGE CONFIGURÉ - Bucket documents prêt!`

---

#### Phase 2: Fonctionnalités avancées (Scripts 8-19)

**Script 8: Multi-devises**
```sql
-- Exécutez: 8-add-currency-support.sql
```
✅ Ajoute colonnes `currency`, `exchange_rate`, `amount_cad` aux transactions

**Script 9: Calendriers de paiement**
```sql
-- Exécutez: 9-add-payment-schedules.sql
```
✅ Crée table `payment_schedules` pour paiements échelonnés

**Script 10: Comptes courants**
```sql
-- Exécutez: 10-add-compte-courant-SIMPLIFIE.sql
```
✅ Crée tables `capex_accounts`, `current_accounts`, `rnd_accounts`
✅ Crée vues `compte_courant_mensuel`, `compte_courant_par_projet`

**Script 11: Pièces jointes projets**
```sql
-- Exécutez: 11-add-property-attachments.sql
```
✅ Crée table `property_attachments` (photos, documents, plans, contrats)

**Script 12: Fiscalité internationale**
```sql
-- Exécutez: 12-add-international-tax-fields.sql
```
✅ Ajoute colonnes fiscales (T1135, T2209) aux investisseurs et transactions

**Script 13: Suivi ROI**
```sql
-- Exécutez: 13-add-roi-performance-tracking.sql
```
✅ Crée vue `property_performance` avec alertes ROI

**Script 14: Amélioration paiements**
```sql
-- Exécutez: 14-enhance-payment-schedules.sql
```
✅ Ajoute champs `actual_payment_date`, `proof_of_payment`, `late_fees`

**Script 15: Lien paiements-transactions**
```sql
-- Exécutez: 15-link-payments-to-transactions.sql
```
✅ Ajoute colonne `linked_transaction_id` aux payment_schedules

**Script 16: Frais et taux effectif**
```sql
-- Exécutez: 16-add-transaction-fees-and-effective-rate.sql
```
✅ Ajoute colonnes `transaction_fees`, `effective_exchange_rate`

**Script 17: Policies Storage**
```sql
-- Exécutez: 17-setup-storage-policies.sql
```
✅ Crée RLS policies pour `transaction-attachments` et `property-attachments`

⚠️ **IMPORTANT:** Créez les buckets AVANT ce script (voir Étape 0)

**Script 18: Système de parts**
```sql
-- Exécutez: 18-create-investor-investments.sql
```
✅ Crée table `investor_investments` (historique achats de parts)
✅ Crée vue `investor_summary`

📖 **Guide détaillé:** Voir `guides/EXECUTE-SHARE-SYSTEM.md`

**Script 19: Paramètres entreprise**
```sql
-- Exécutez: 19-create-company-settings.sql
```
✅ Crée table `company_settings`
✅ Crée fonctions `get_setting()`, `update_setting()`
✅ Crée vue `share_settings`

---

## ✅ VÉRIFICATION FINALE

Après avoir exécuté TOUS les scripts (1-19), vérifiez l'installation :

### 1. Vérifier le nombre de tables

```sql
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';
```

**Résultat attendu:** 20+ tables

### 2. Vérifier les vues

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Résultat attendu:**
- `compte_courant_mensuel`
- `compte_courant_par_projet`
- `investor_summary`
- `property_performance`
- `share_settings`
- `summary_view`

### 3. Vérifier les buckets Storage

```sql
SELECT id, name, public
FROM storage.buckets
ORDER BY name;
```

**Résultat attendu:**
| id | name | public |
|----|------|--------|
| documents | documents | true |
| property-attachments | property-attachments | false |
| transaction-attachments | transaction-attachments | false |

### 4. Vérifier RLS activé

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Résultat attendu:** `rowsecurity = true` pour toutes les tables

### 5. Test des données

```sql
SELECT
  (SELECT COUNT(*) FROM investors) as investisseurs,
  (SELECT COUNT(*) FROM properties) as proprietes,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM payment_schedules) as paiements,
  (SELECT SUM(total_invested) FROM investors) as total_investi;
```

**Résultat attendu (avec données de test):**
- investisseurs: 4
- proprietes: 3
- transactions: 5+
- paiements: 10+
- total_investi: 344,915.19 CAD

---

## 🆘 DÉPANNAGE

### Erreur: "relation does not exist"

**Cause:** Script exécuté dans le mauvais ordre
**Solution:** Réexécutez les scripts dans l'ordre (1-19)

### Erreur: "duplicate key value violates unique constraint"

**Cause:** Script déjà exécuté
**Solution:** Passez au script suivant OU exécutez `1-cleanup.sql` pour recommencer

### Erreur: "column already exists"

**Cause:** Migration partielle déjà appliquée
**Solution:** Passez au script suivant

### Erreur: "bucket does not exist"

**Cause:** Buckets Storage non créés
**Solution:** Créez les 3 buckets manuellement (voir Étape 0)

### Tout recommencer

```sql
-- Exécutez 99-reset-all-data.sql
-- Puis recommencez à partir du script 1
```

⚠️ **ATTENTION:** Ceci supprime TOUTES les données !

---

## 🔐 ÉTAPE SUIVANTE: Configuration Auth

Une fois la base de données installée, configurez l'authentification :

📖 **Guide:** `guides/SETUP-AUTH.md`

Vous devrez :
1. Créer les utilisateurs dans Supabase Auth
2. Lier les `user_id` aux investisseurs
3. Tester la connexion

---

## 📚 GUIDES CONNEXES

| Guide | Description |
|-------|-------------|
| `SETUP-AUTH.md` | Configuration authentification utilisateurs |
| `SETUP-STORAGE.md` | Création buckets Storage |
| `EXECUTE-SHARE-SYSTEM.md` | Migration système de parts |
| `INSTALLATION-PWA.md` | Installation Progressive Web App |
| `DEPLOYMENT-GUIDE.md` | Déploiement complet sur Vercel |

---

## 📊 STRUCTURE FINALE

Après installation complète, vous aurez :

**20+ Tables:**
- investors, properties, transactions
- payment_schedules, property_attachments
- capex_accounts, current_accounts, rnd_accounts
- investor_investments, company_settings
- dividends, dividend_allocations, documents, reports, operational_expenses

**6 Vues:**
- summary_view
- compte_courant_mensuel, compte_courant_par_projet
- property_performance
- investor_summary
- share_settings

**3 Buckets Storage:**
- documents (public)
- transaction-attachments (privé)
- property-attachments (privé)

**Fonctionnalités:**
- ✅ Multi-devises (USD, CAD, DOP, EUR)
- ✅ Calendriers de paiement échelonnés
- ✅ Comptes courants (CAPEX, R&D, opérationnel)
- ✅ Pièces jointes projets et transactions
- ✅ Fiscalité internationale (T1135, T2209)
- ✅ Suivi performance ROI avec alertes
- ✅ Système de parts investisseurs
- ✅ Row Level Security (RLS) activé

---

## ✅ CHECKLIST COMPLÈTE

- [ ] Compte Supabase créé
- [ ] Projet Supabase créé
- [ ] Buckets Storage créés (3)
- [ ] Script 1-7 exécutés (base)
- [ ] Script 8-19 exécutés (extensions)
- [ ] Vérification finale réussie
- [ ] Configuration Auth complétée
- [ ] Test connexion application réussi

---

**Version:** 2.0
**Dernière mise à jour:** Octobre 2025
**Auteur:** Équipe CERDIA

🎉 **Installation terminée!** Vous pouvez maintenant passer à la configuration de l'application.
