# 📂 SUPABASE - Base de données CERDIA Investment Platform

Bienvenue dans le dossier de configuration de la base de données Supabase pour la plateforme CERDIA.

---

## 🎯 DÉMARRAGE RAPIDE

### Pour installer la base de données complète :

1. **Lisez le guide d'installation:** [`guides/INSTALLATION-COMPLETE.md`](guides/INSTALLATION-COMPLETE.md)
2. **Créez les buckets Storage:** [`guides/SETUP-STORAGE.md`](guides/SETUP-STORAGE.md)
3. **Exécutez les scripts SQL** dans l'ordre (1-19)
4. **Configurez l'authentification:** [`guides/SETUP-AUTH.md`](guides/SETUP-AUTH.md)

⏱️ **Durée totale:** 15-20 minutes

---

## 📁 STRUCTURE DU DOSSIER

```
supabase/
├── 📘 README.md                                   ← Vous êtes ici
│
├── 📁 guides/                                     ← Documentation
│   ├── INSTALLATION-COMPLETE.md                   → Guide installation SQL (1-19)
│   ├── INSTALLATION-PWA.md                        → Guide installation Progressive Web App
│   ├── SETUP-AUTH.md                              → Configuration authentification
│   ├── SETUP-STORAGE.md                           → Création buckets Storage
│   ├── EXECUTE-SHARE-SYSTEM.md                    → Migration système de parts
│   └── DEPLOYMENT-GUIDE.md                        → Déploiement complet Vercel
│
├── 🔵 Scripts de Base (1-7)                       ← Obligatoires
│   ├── 1-cleanup.sql                              → Nettoyage
│   ├── 2-create-tables.sql                        → 11 tables principales
│   ├── 3-create-indexes.sql                       → Index performance
│   ├── 4-create-triggers.sql                      → Triggers et fonctions
│   ├── 5-enable-rls.sql                           → Sécurité (RLS)
│   ├── 6-insert-data.sql                          → Données de test
│   └── 7-storage-policies.sql                     → Storage "documents"
│
├── 🟢 Scripts d'Extension (8-19)                  ← Recommandés
│   ├── 8-add-currency-support.sql                 → Multi-devises
│   ├── 9-add-payment-schedules.sql                → Calendriers paiement
│   ├── 10-add-compte-courant-SIMPLIFIE.sql        → Comptes CAPEX/R&D
│   ├── 11-add-property-attachments.sql            → Pièces jointes projets
│   ├── 12-add-international-tax-fields.sql        → Fiscalité T1135/T2209
│   ├── 13-add-roi-performance-tracking.sql        → Suivi ROI
│   ├── 14-enhance-payment-schedules.sql           → Amélioration paiements
│   ├── 15-link-payments-to-transactions.sql       → Lien paiements↔transactions
│   ├── 16-add-transaction-fees-and-effective-rate.sql → Frais & taux
│   ├── 17-setup-storage-policies.sql              → Policies storage supplémentaires
│   ├── 18-create-investor-investments.sql         → Système de parts
│   └── 19-create-company-settings.sql             → Paramètres globaux
│
└── 🔴 Scripts Utilitaires
    └── 99-reset-all-data.sql                      → Vider données (debug)
```

---

## 📋 SCRIPTS SQL - RÉFÉRENCE RAPIDE

### 🔵 Scripts de Base (1-7) - Installation Initiale

| # | Script | Description | Tables/Objets créés |
|---|--------|-------------|---------------------|
| **1** | cleanup | Nettoie la base de données | Supprime tout |
| **2** | create-tables | Crée les tables principales | 11 tables |
| **3** | create-indexes | Ajoute index de performance | 15+ index |
| **4** | create-triggers | Crée triggers et fonctions | 5 triggers, vue summary |
| **5** | enable-rls | Active Row Level Security | RLS sur 11 tables |
| **6** | insert-data | Insère données de test | 4 investisseurs, 3 propriétés |
| **7** | storage-policies | Configure Storage | Bucket "documents" |

**Tables créées (1-7):**
- `investors` - Profils investisseurs
- `properties` - Propriétés immobilières
- `transactions` - Transactions financières
- `documents` - Documents investisseurs
- `reports` - Rapports générés
- `dividends` - Dividendes distribués
- `dividend_allocations` - Allocations dividendes
- `operational_expenses` - Dépenses opérationnelles
- `capex_accounts` - Comptes CAPEX
- `current_accounts` - Comptes courants
- `rnd_accounts` - Comptes R&D

---

### 🟢 Scripts d'Extension (8-19) - Fonctionnalités Avancées

| # | Script | Description | Dépendances |
|---|--------|-------------|-------------|
| **8** | currency-support | Support multi-devises | 2 |
| **9** | payment-schedules | Calendriers de paiement | 2, 8 |
| **10** | compte-courant | Comptes courants simplifiés | 2 |
| **11** | property-attachments | Pièces jointes projets | 2 |
| **12** | international-tax | Fiscalité internationale | 2, 8 |
| **13** | roi-performance | Suivi performance ROI | 2 |
| **14** | enhance-payment | Amélioration paiements | 9 |
| **15** | link-payments | Lien paiements-transactions | 2, 9 |
| **16** | transaction-fees | Frais et taux effectif | 2, 8 |
| **17** | storage-policies | Policies Storage avancées | - |
| **18** | investor-investments | Système de parts | 2 |
| **19** | company-settings | Paramètres globaux | - |

**Tables/Vues ajoutées (8-19):**
- `payment_schedules` - Échéanciers de paiement
- `property_attachments` - Fichiers projets
- `investor_investments` - Historique achats de parts
- `company_settings` - Paramètres entreprise
- `compte_courant_mensuel` (vue) - Comptes par mois
- `compte_courant_par_projet` (vue) - Comptes par projet
- `property_performance` (vue) - Performance ROI
- `investor_summary` (vue) - Résumé investisseurs
- `share_settings` (vue) - Paramètres parts

---

## 🗂️ GUIDES DE DOCUMENTATION

### 📘 Pour les Débutants

1. **[INSTALLATION-COMPLETE.md](guides/INSTALLATION-COMPLETE.md)** ⭐ COMMENCER ICI
   - Guide étape par étape (1-19)
   - Vérifications à chaque étape
   - Dépannage et erreurs courantes
   - Durée: 15-20 minutes

2. **[SETUP-STORAGE.md](guides/SETUP-STORAGE.md)**
   - Création des 3 buckets Storage
   - Configuration RLS policies
   - Structure des chemins fichiers

3. **[SETUP-AUTH.md](guides/SETUP-AUTH.md)**
   - Création utilisateurs Supabase Auth
   - Liaison user_id ↔ investors
   - Test de connexion

### 📗 Pour les Fonctionnalités Avancées

4. **[EXECUTE-SHARE-SYSTEM.md](guides/EXECUTE-SHARE-SYSTEM.md)**
   - Migration système de parts
   - Concept parts fixes / valeur variable
   - Migration données existantes

5. **[INSTALLATION-PWA.md](guides/INSTALLATION-PWA.md)**
   - Installation Progressive Web App
   - Mobile (iOS/Android) et Desktop
   - Configuration hors-ligne

### 📕 Pour le Déploiement

6. **[DEPLOYMENT-GUIDE.md](guides/DEPLOYMENT-GUIDE.md)**
   - Déploiement complet sur Vercel
   - Configuration Supabase Production
   - Instructions vente/transfert
   - Vérifications finales

---

## ⚡ INSTALLATION EXPRESS

Pour une installation complète sans interruption :

```bash
# 1. Créer les buckets Storage manuellement dans Supabase Dashboard:
#    - documents (public, 50MB)
#    - transaction-attachments (privé, 50MB)
#    - property-attachments (privé, 50MB)

# 2. Dans Supabase SQL Editor, exécuter dans l'ordre:
# Scripts 1-7  (base)
# Scripts 8-19 (extensions)

# 3. Configurer Auth (voir SETUP-AUTH.md)

# 4. Tester l'application
```

⏱️ **Temps total:** ~15 minutes

---

## 🆘 DÉPANNAGE RAPIDE

### Erreur: "relation does not exist"
**Solution:** Exécutez les scripts dans l'ordre (1→2→3...→19)

### Erreur: "column already exists"
**Solution:** Script déjà exécuté, passez au suivant

### Erreur: "bucket does not exist"
**Solution:** Créez les buckets manuellement (voir SETUP-STORAGE.md)

### Erreur: "column i.name does not exist"
**Solution:** Utilisez `CONCAT(i.first_name, ' ', i.last_name)` (déjà corrigé dans script 18)

### Tout recommencer
```sql
-- Exécutez 99-reset-all-data.sql
-- Puis recommencez depuis le script 1
```

⚠️ **ATTENTION:** Supprime TOUTES les données!

---

## 📊 RÉSULTAT FINAL

Après installation complète (scripts 1-19), vous aurez :

### Base de données
✅ **20+ tables** relationnelles
✅ **6 vues** SQL optimisées
✅ **15+ index** de performance
✅ **Row Level Security** activé sur toutes les tables
✅ **Triggers automatiques** pour updated_at

### Fonctionnalités
✅ Multi-devises (USD, CAD, DOP, EUR)
✅ Calendriers de paiement échelonnés
✅ Comptes courants (CAPEX, R&D, opérationnel)
✅ Pièces jointes (projets & transactions)
✅ Fiscalité internationale (T1135, T2209)
✅ Suivi performance ROI avec alertes
✅ Système de parts investisseurs
✅ Paramètres globaux configurables

### Storage
✅ **3 buckets** configurés
✅ **RLS policies** actives
✅ Support fichiers: PDF, images, Office docs

---

## 🔐 SÉCURITÉ

Tous les scripts activent automatiquement :

- ✅ **Row Level Security (RLS)** sur toutes les tables
- ✅ **Policies authentifiées** (lecture/écriture)
- ✅ **Validation données** (constraints, checks)
- ✅ **Clés étrangères** (intégrité référentielle)
- ✅ **Triggers automatiques** (cohérence données)

Les utilisateurs ne peuvent accéder qu'à leurs propres données.

---

## 🚀 PROCHAINES ÉTAPES

Après avoir installé la base de données :

1. ✅ **Configurez l'authentification** → `guides/SETUP-AUTH.md`
2. ✅ **Testez l'application** → Connectez-vous au dashboard
3. ✅ **Installez la PWA** → `guides/INSTALLATION-PWA.md`
4. ✅ **Déployez en production** → `guides/DEPLOYMENT-GUIDE.md`

---

## 📞 SUPPORT

**Documentation Supabase:**
- Tables: https://supabase.com/docs/guides/database/tables
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Storage: https://supabase.com/docs/guides/storage

**Documentation Next.js:**
- App Router: https://nextjs.org/docs/app
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

## 📝 HISTORIQUE DES VERSIONS

| Date | Version | Changements |
|------|---------|-------------|
| Oct 2025 | 2.0 | Réorganisation complète, guides séparés |
| Oct 2025 | 1.5 | Ajout scripts 18-19 (système de parts) |
| Oct 2025 | 1.0 | Version initiale (scripts 1-17) |

---

## ✅ CHECKLIST INSTALLATION

- [ ] Compte Supabase créé
- [ ] Projet Supabase configuré
- [ ] Buckets Storage créés (3)
- [ ] Scripts 1-7 exécutés (base)
- [ ] Scripts 8-19 exécutés (extensions)
- [ ] Vérification finale réussie
- [ ] Authentification configurée
- [ ] Application testée et fonctionnelle

---

**🎉 Prêt à commencer?**

👉 Ouvrez [`guides/INSTALLATION-COMPLETE.md`](guides/INSTALLATION-COMPLETE.md)

---

**Version:** 2.0
**Dernière mise à jour:** Octobre 2025
**Auteur:** Équipe CERDIA
**License:** Propriétaire
