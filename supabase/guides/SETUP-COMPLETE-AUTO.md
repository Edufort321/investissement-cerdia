# Guide complet d'installation automatique (NOUVEAU)

Ce guide remplace toutes les installations manuelles par des scripts SQL automatiques.

## 🎯 Objectif

Exécuter **TOUS** les scripts SQL nécessaires dans le bon ordre pour avoir une installation complète et fonctionnelle.

---

## 📋 Liste des scripts à exécuter (dans l'ordre)

### Phase 1: Infrastructure de base

```sql
1. ✅ 1-cleanup.sql                  -- Nettoyage (si réinstallation)
2. ✅ 2-create-tables.sql            -- Création des 11 tables de base
3. ✅ 3-create-indexes.sql           -- Index pour performance
4. ✅ 4-create-triggers.sql          -- Triggers automatiques
5. ✅ 5-enable-rls.sql               -- Sécurité Row-Level Security
6. ✅ 6-insert-data.sql              -- Données de test (optionnel)
```

### Phase 2: Storage (NOUVEAU - Automatique)

```sql
7. 🆕 47-create-all-storage-buckets.sql  -- Crée TOUS les buckets automatiquement
8. ✅ 7-storage-policies.sql              -- Policies pour bucket 'documents'
9. ✅ 17-setup-storage-policies.sql       -- Policies pour property/transaction-attachments
10. ✅ 21-scenario-storage-policies.sql   -- Policies pour scenario-documents
```

### Phase 3: Fonctionnalités avancées

```sql
11. ✅ 8-add-currency-support.sql
12. ✅ 9-add-payment-schedules.sql
13. ✅ 10-add-compte-courant-SIMPLIFIE.sql
14. ✅ 11-add-property-attachments.sql
15. ✅ 12-add-international-tax-fields.sql
16. ✅ 13-add-roi-performance-tracking.sql
17. ✅ 14-enhance-payment-schedules.sql
18. ✅ 15-link-payments-to-transactions.sql
19. ✅ 16-add-transaction-fees-and-effective-rate.sql
20. ✅ 18-create-investor-investments.sql
21. ✅ 19-create-company-settings.sql
22. ✅ 20-create-scenarios.sql
23. ✅ 22-add-voting-permission.sql
24. ✅ 24-add-location-to-scenarios.sql
25. ✅ 25-add-transaction-fees-to-scenarios.sql
26. ✅ 26-add-main-photo-to-scenarios.sql
27. ✅ 27-add-actual-values-tracking.sql
28. ✅ 28-add-bookings-calendar.sql
29. ✅ 29-add-investor-reservations.sql
30. ✅ 30-add-unified-calendar-fields.sql
31. ✅ 31-add-occupation-rate-calculations.sql
32. ✅ 32-sync-booking-revenues.sql
33. ✅ 33-add-share-links.sql
34. ✅ 34-treasury-management.sql
35. ✅ 35-project-management.sql
36. ✅ 36-budgeting-system.sql
37. ✅ 37-investor-onboarding-functions.sql
```

### Phase 4: Corrections et améliorations récentes

```sql
38. ✅ 38-fix-eric-dufort-permissions.sql
39. ✅ 39-update-investment-type-constraint.sql
40. ✅ 40-fix-investment-type-constraint.sql
41. 🆕 41-final-investment-types.sql
42. 🆕 42-fix-scenarios-rls-policies.sql
43. 🆕 43-add-pending-transfer-status.sql
44. 🆕 44-add-deduct-initial-from-first-term.sql
45. 🆕 45-add-main-photo-to-properties.sql
```

---

## 🚀 Installation rapide (recommandé)

### Option A: Tout exécuter d'un coup (NOUVEAU)

Si tu as déjà exécuté les scripts 1-40, tu peux simplement exécuter ces **6 nouveaux scripts**:

```
✅ Script 47 (buckets automatiques)
✅ Script 21 (policies scénarios)
✅ Script 41 (types investissement)
✅ Script 42 (RLS scénarios)
✅ Script 43 (statut pending_transfer)
✅ Script 44 (déduction acompte)
✅ Script 45 (photo propriétés)
```

### Option B: Installation complète depuis zéro

Si c'est une nouvelle installation, exécute **TOUS** les scripts de 1 à 47 dans l'ordre.

---

## 📝 Instructions d'exécution

### Étape 1: Accéder à Supabase SQL Editor

1. Va sur [supabase.com](https://supabase.com)
2. Sélectionne ton projet
3. Menu de gauche → **SQL Editor**
4. Clique sur **New Query**

### Étape 2: Exécuter chaque script

Pour chaque script:

1. Ouvre le fichier `.sql` dans ton éditeur
2. **Copie** tout le contenu
3. Dans Supabase SQL Editor, **colle** le contenu
4. Clique sur **Run** (ou Ctrl+Enter / Cmd+Enter)
5. **Attends** le message de confirmation
6. **Passe** au script suivant

### Étape 3: Vérifier les buckets de storage

Après avoir exécuté le script 47, vérifie dans Supabase Dashboard:

1. Menu de gauche → **Storage**
2. Tu devrais voir **4 buckets**:
   - ✅ `documents` (public)
   - ✅ `scenario-documents` (privé)
   - ✅ `property-attachments` (privé)
   - ✅ `transaction-attachments` (privé)

---

## ✅ Checklist de vérification

Après l'installation complète:

### Buckets de storage
- [ ] `documents` existe et est public
- [ ] `scenario-documents` existe et est privé
- [ ] `property-attachments` existe et est privé
- [ ] `transaction-attachments` existe et est privé

### Tables principales
- [ ] `investors` existe
- [ ] `properties` existe avec colonne `main_photo_url`
- [ ] `scenarios` existe avec colonne `deduct_initial_from_first_term`
- [ ] `payment_schedules` existe
- [ ] `transactions` existe
- [ ] `property_attachments` existe

### Fonctionnalités
- [ ] Upload photo dans scénario fonctionne
- [ ] Création de scénario avec frais de transaction fonctionne
- [ ] Vote sur scénario fonctionne
- [ ] Conversion scénario → projet fonctionne
- [ ] Photo transférée du scénario au projet

---

## 🆕 Nouveautés (Scripts 41-47)

### Script 41: Types d'investissement finaux
Finalise les types d'investissement acceptés.

### Script 42: RLS scénarios
Corrige les permissions pour créer/modifier des scénarios.

### Script 43: Statut "pending_transfer"
Ajoute le workflow de vote automatisé avec statut intermédiaire.

### Script 44: Déduction d'acompte
Permet de déduire automatiquement l'acompte initial du premier terme.

### Script 45: Photo principale propriétés
Ajoute la colonne pour transférer la photo du scénario au projet.

### Script 47: Buckets automatiques ⭐
**NOUVEAU**: Crée automatiquement TOUS les buckets de storage sans intervention manuelle!

---

## ⚠️ Dépannage

### Erreur: "duplicate key value"
**Cause**: Le script a déjà été exécuté
**Solution**: Normal, passe au suivant

### Erreur: "permission denied"
**Cause**: Pas les droits admin
**Solution**: Connecte-toi avec un compte admin Supabase

### Erreur: "relation does not exist"
**Cause**: Script exécuté dans le mauvais ordre
**Solution**: Retourne aux scripts précédents manquants

### Bucket n'apparaît pas dans Storage
**Cause**: Script 47 pas exécuté ou erreur
**Solution**: Réexécute le script 47 et vérifie les logs

---

## 📊 Temps d'installation estimé

- **Installation rapide** (scripts 41-47 seulement): ~5 minutes
- **Installation complète** (tous les scripts): ~15-20 minutes

---

**Date de création**: 2025-01-24
**Version**: 2.0 (Installation automatique)
**Auteur**: System Migration
