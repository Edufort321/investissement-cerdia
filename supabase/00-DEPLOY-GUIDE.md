# 📋 GUIDE DE DÉPLOIEMENT COMPLET - CERDIA INVESTMENT PLATFORM

**Version :** 1.0
**Date :** Octobre 2025
**Auteur :** CERDIA Development Team

---

## 🎯 Objectif de ce Guide

Ce guide vous permet de déployer la plateforme CERDIA Investment **from scratch** sur :
- ✅ Un nouveau projet Supabase
- ✅ Un nouveau déploiement Vercel
- ✅ Un nouveau domaine custom

**Cas d'usage :**
- Nouveau client qui achète l'application
- Migration vers un nouveau projet Supabase
- Restauration complète après incident
- Environnement de test/staging

---

## 📦 Prérequis

### Comptes Nécessaires

- [ ] Compte Supabase (gratuit ou pro)
- [ ] Compte Vercel (gratuit ou pro)
- [ ] Compte GitHub (pour le code source)
- [ ] Nom de domaine (optionnel)

### Informations à Préparer

- [ ] Email de l'administrateur principal
- [ ] Prénom de l'admin
- [ ] Nom de l'admin
- [ ] Liste des investisseurs initiaux (optionnel)

---

## 🚀 ÉTAPE 1 : Créer le Projet Supabase

### 1.1 Créer le Projet

1. Allez sur https://supabase.com/dashboard
2. Cliquez sur **"New project"**
3. Remplissez :
   - **Name :** CERDIA Investment Platform
   - **Database Password :** [Générez un mot de passe fort]
   - **Region :** Choisissez la région la plus proche de vos utilisateurs
4. Cliquez sur **"Create new project"**
5. ⏳ Attendez 2-3 minutes que le projet soit créé

### 1.2 Noter les Informations Importantes

Une fois le projet créé, allez dans **Settings** → **API** et notez :

```
Project URL: https://[votre-project-id].supabase.co
anon/public key: eyJhbGc...
service_role key: eyJhbGc... (GARDEZ CONFIDENTIEL)
```

---

## 🗄️ ÉTAPE 2 : Déployer la Base de Données

### 2.1 Option A : Déploiement Automatique (RECOMMANDÉ)

1. Allez dans **SQL Editor** → **New query**
2. Copiez le contenu du fichier **`00-MASTER-DEPLOY.sql`**
3. Collez dans l'éditeur
4. Cliquez sur **"Run"** (▶️)
5. ⏳ Attendez 1-2 minutes
6. Vérifiez les messages de confirmation

**Résultat attendu :**
```
✅ SCRIPT 1: CLEANUP - OK
✅ SCRIPT 2: TABLES CRÉÉES - OK
✅ SCRIPT 3: INDEX CRÉÉS - OK
...
✅ SCRIPT 36: BUDGETING - OK
✅ DÉPLOIEMENT COMPLET RÉUSSI
```

### 2.2 Option B : Déploiement Manuel (si erreur avec Option A)

Exécutez les scripts **dans l'ordre numérique** :

```bash
1-cleanup.sql             # Nettoyage
2-create-tables.sql       # Tables de base
3-create-indexes.sql      # Index
4-create-triggers.sql     # Triggers
5-enable-rls.sql          # Row Level Security
6-insert-data.sql         # Données de test (OPTIONNEL)
7-storage-policies.sql    # Politiques Storage
8-add-currency-support.sql
9-add-payment-schedules.sql
10-add-compte-courant-SIMPLIFIE.sql
11-add-property-attachments.sql
12-add-international-tax-fields.sql
13-add-roi-performance-tracking.sql
14-enhance-payment-schedules.sql
15-link-payments-to-transactions.sql
16-add-transaction-fees-and-effective-rate.sql
17-setup-storage-policies.sql
18-create-investor-investments.sql
19-create-company-settings.sql
20-create-scenarios.sql
21-scenario-storage-policies.sql
22-add-voting-permission.sql
23-delete-existing-projects.sql        # OPTIONNEL (si migration)
24-add-location-to-scenarios.sql
25-add-transaction-fees-to-scenarios.sql
26-add-main-photo-to-scenarios.sql
27-add-actual-values-tracking.sql
28-add-bookings-calendar.sql
29-add-investor-reservations.sql
30-add-unified-calendar-fields.sql
31-add-occupation-rate-calculations.sql
32-sync-booking-revenues.sql
33-add-share-links.sql
34-treasury-management.sql
35-project-management.sql
36-budgeting-system.sql
37-investor-onboarding-functions.sql   # Fonctions d'onboarding
```

---

## 📂 ÉTAPE 3 : Créer les Buckets Storage

### 3.1 Créer les 4 Buckets

Allez dans **Storage** → **Create bucket** et créez :

| Nom du Bucket | Public | Taille Max | Usage |
|---------------|--------|------------|-------|
| `documents` | ✅ Oui | 50 MB | Documents publics |
| `transaction-attachments` | ❌ Non | 50 MB | Pièces jointes privées |
| `property-attachments` | ❌ Non | 50 MB | Photos de propriétés |
| `scenario-documents` | ❌ Non | 50 MB | Documents de scénarios |

### 3.2 Appliquer les Politiques de Sécurité

Les politiques sont **déjà configurées** via les scripts SQL 7, 17 et 21.

---

## 👤 ÉTAPE 4 : Créer l'Administrateur Principal

### 4.1 Créer le Compte Supabase Auth

1. Allez dans **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Remplissez :
   - **Email :** eric.dufort@cerdia.ai (votre email)
   - **Password :** [Laissez vide, il sera généré]
   - Cochez **"Auto Confirm User"**
4. Cliquez sur **"Create user"**
5. **Notez le User ID** (format UUID)

### 4.2 Créer le Profil Investisseur

1. Allez dans **SQL Editor** → **New query**
2. Copiez et exécutez **`38-fix-eric-dufort.sql`**
3. Ou exécutez manuellement :

```sql
-- Remplacez [USER_ID] par l'ID de l'étape 4.1
INSERT INTO investors (
  user_id,
  first_name,
  last_name,
  email,
  username,
  action_class,
  access_level,
  permissions,
  can_vote,
  status
) VALUES (
  '[USER_ID]',          -- UUID de Supabase Auth
  'Eric',               -- Prénom
  'Dufort',             -- Nom
  'eric.dufort@cerdia.ai',
  'eric.dufort',
  'A',                  -- Classe d'action
  'admin',
  '{
    "dashboard": true,
    "projet": true,
    "administration": true,
    "voting": true
  }'::jsonb,
  true,
  'actif'
);
```

### 4.3 Vérifier la Création

```sql
SELECT
  i.first_name,
  i.last_name,
  i.email,
  i.access_level,
  i.permissions,
  i.user_id,
  a.email as auth_email
FROM investors i
LEFT JOIN auth.users a ON i.user_id = a.id
WHERE i.email = 'eric.dufort@cerdia.ai';
```

**Résultat attendu :**
```
first_name | last_name | email                  | access_level | user_id
Eric       | Dufort    | eric.dufort@cerdia.ai  | admin        | abc123...
```

---

## 🌐 ÉTAPE 5 : Déployer sur Vercel

### 5.1 Forker le Repo GitHub

1. Allez sur le repo source
2. Cliquez sur **"Fork"**
3. Donnez un nouveau nom (ex: `cerdia-investment-client1`)

### 5.2 Connecter à Vercel

1. Allez sur https://vercel.com/dashboard
2. Cliquez sur **"Add New"** → **"Project"**
3. Sélectionnez votre fork GitHub
4. Cliquez sur **"Import"**

### 5.3 Configurer les Variables d'Environnement

Dans **Settings** → **Environment Variables**, ajoutez :

```env
NEXT_PUBLIC_SUPABASE_URL=[Votre Project URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Votre anon key]
OPENAI_API_KEY=[Optionnel - pour l'IA]
```

### 5.4 Déployer

1. Cliquez sur **"Deploy"**
2. ⏳ Attendez 2-3 minutes
3. Récupérez l'URL : `https://[app-name].vercel.app`

---

## 🔒 ÉTAPE 6 : Configurer l'Authentification

### 6.1 Autoriser les URLs dans Supabase

1. Allez dans **Authentication** → **URL Configuration**
2. **Site URL :** `https://www.votre-domaine.com` (ou URL Vercel)
3. **Redirect URLs :** Ajoutez :
   ```
   https://www.votre-domaine.com/**
   https://[app-name].vercel.app/**
   http://localhost:3000/**
   ```

### 6.2 Configurer le Domaine Custom (Optionnel)

1. Dans Vercel → **Settings** → **Domains**
2. Ajoutez votre domaine : `www.cerdia.ai`
3. Configurez les DNS selon les instructions Vercel

---

## ✅ ÉTAPE 7 : Vérification Finale

### 7.1 Checklist de Vérification

- [ ] Toutes les tables sont créées (11 tables de base + extensions)
- [ ] Les 4 buckets storage existent
- [ ] L'admin principal est créé avec `access_level = 'admin'`
- [ ] Le déploiement Vercel fonctionne
- [ ] L'authentification fonctionne (test de login)
- [ ] Les permissions admin sont accordées
- [ ] Le domaine custom est configuré (si applicable)

### 7.2 Test de Connexion

1. Allez sur votre URL (Vercel ou domaine custom)
2. Cliquez sur **"Connexion"**
3. Connectez-vous avec l'email de l'admin
4. Vérifiez l'accès à :
   - ✅ Dashboard
   - ✅ Projet
   - ✅ Évaluateur
   - ✅ Scénarios
   - ✅ Administration

### 7.3 Test de Création d'Investisseur

1. Allez dans **Administration** → **Investisseurs**
2. Créez un nouvel investisseur
3. Vérifiez que le mot de passe est généré automatiquement
4. Vérifiez que l'email est envoyé (si configuré)

---

## 🔧 ÉTAPE 8 : Configuration Post-Déploiement

### 8.1 Configurer les Paramètres de l'Entreprise

```sql
-- Mettre à jour les paramètres globaux
UPDATE company_settings
SET
  company_name = 'Votre Entreprise Inc.',
  base_currency = 'CAD',
  share_nominal_value = 1.00,
  total_authorized_shares = 100000
WHERE id = 1;
```

### 8.2 Ajouter les Investisseurs Initiaux

Utilisez la fonction d'onboarding (créée dans script 37) :

```sql
-- Fonction à venir dans le prochain script
SELECT create_investor(
  'Jean',
  'Dupont',
  'jean.dupont@example.com',
  'A',
  '{"dashboard": true, "projet": false}'::jsonb
);
```

---

## 🚨 Dépannage

### Problème : Les scripts SQL échouent

**Solution :**
1. Vérifiez que vous exécutez dans l'ordre
2. Lisez les messages d'erreur
3. Utilisez `99-reset-all-data.sql` pour repartir de zéro (⚠️ EFFACE TOUT)

### Problème : Login ne fonctionne pas

**Solution :**
1. Vérifiez que l'URL est dans les Redirect URLs Supabase
2. Videz le cache navigateur : `localStorage.clear()`
3. Vérifiez que `user_id` dans `investors` correspond à `auth.users.id`

### Problème : Permissions refusées

**Solution :**
1. Vérifiez que les politiques RLS sont créées
2. Exécutez `38-fix-eric-dufort.sql` pour votre admin
3. Reconnectez-vous après modification des permissions

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@cerdia.com
- 📚 Documentation : docs.cerdia.com
- 🐛 Issues GitHub : github.com/cerdia/issues

---

## 📝 Changelog

### Version 1.0 (Octobre 2025)
- ✅ Guide initial complet
- ✅ 36 scripts SQL numérotés
- ✅ Fonction d'onboarding investisseur
- ✅ Support multi-devises
- ✅ Système de scénarios et votes

---

**🎉 Félicitations ! Votre plateforme CERDIA Investment est maintenant déployée et prête à l'emploi.**
