# 🔐 PROBLÈME DE CONNEXION - ÉRIC DUFORT

## Symptôme
Le compte **Eric Dufort** avec mot de passe **321Eduf!$** ne fonctionne plus.

## Cause
Lors de la migration vers **Supabase Auth**, les anciens comptes localStorage ont été supprimés. Ton compte doit être recréé dans Supabase Authentication.

---

## ✅ SOLUTION RAPIDE

### Option 1: Via le Dashboard Supabase (Recommandé - 2 minutes)

1. **Aller dans Supabase Dashboard**
   - Va sur https://supabase.com/dashboard
   - Connecte-toi avec ton compte Supabase
   - Sélectionne ton projet `investissement-cerdia`

2. **Créer l'utilisateur Auth**
   - Va dans **Authentication** > **Users** (menu gauche)
   - Clique **Add User** > **Create new user**
   - Remplis:
     - **Email:** `eric.dufort@cerdia.com`
     - **Password:** `321Eduf!$`
     - **Auto Confirm User:** ✅ COCHE CETTE CASE
   - Clique **Create User**
   - **⚠️ COPIE L'UUID QUI APPARAÎT** (format: `a1b2c3d4-...`)

3. **Lier l'utilisateur à l'investisseur**
   - Va dans **SQL Editor** (menu gauche)
   - Clique **New Query**
   - Copie ce script:

```sql
-- 1. Vérifier l'UUID de l'utilisateur Auth
SELECT id, email FROM auth.users WHERE email = 'eric.dufort@cerdia.com';

-- 2. Lier à l'investisseur (REMPLACE 'UUID_ICI' par l'UUID copié)
UPDATE investors
SET user_id = 'UUID_ICI'
WHERE email = 'eric.dufort@cerdia.com';

-- 3. Vérification finale
SELECT
  i.first_name,
  i.last_name,
  i.email,
  i.user_id,
  u.email as auth_email
FROM investors i
LEFT JOIN auth.users u ON i.user_id = u.id
WHERE i.email = 'eric.dufort@cerdia.com';
```

   - Remplace `UUID_ICI` par l'UUID copié à l'étape 2
   - Clique **Run**

4. **Tester la connexion**
   - Va sur https://investissement-cerdia.vercel.app/connexion
   - OU sur http://localhost:3000/connexion (si en local)
   - Tape **"Eric"** dans la barre de recherche
   - Sélectionne **"Éric Dufort"**
   - Entre le mot de passe: **321Eduf!$**
   - Clique **Se connecter**

   ✅ **Tu devrais être redirigé vers le dashboard!**

---

### Option 2: Via SQL Script (3 minutes)

J'ai créé un script complet pour toi: **`supabase/FIX-AUTH-ERIC.sql`**

1. Va dans **Supabase Dashboard** > **SQL Editor**
2. Clique **New Query**
3. Ouvre le fichier `supabase/FIX-AUTH-ERIC.sql`
4. Copie tout le contenu
5. Colle dans l'éditeur SQL
6. Suis les instructions dans le script (c'est bien commenté)

---

## 🔍 DIAGNOSTIC

Si ça ne fonctionne toujours pas, exécute ces requêtes pour diagnostiquer:

### Vérifier l'utilisateur Auth existe:
```sql
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'eric.dufort@cerdia.com';
```

**Résultat attendu:** 1 ligne avec `email_confirmed_at` rempli

### Vérifier le lien avec l'investisseur:
```sql
SELECT
  i.first_name,
  i.last_name,
  i.email,
  i.user_id as investor_user_id,
  u.id as auth_user_id,
  CASE WHEN i.user_id = u.id THEN '✅ OK' ELSE '❌ INCORRECT' END as status
FROM investors i
LEFT JOIN auth.users u ON i.user_id = u.id
WHERE i.email = 'eric.dufort@cerdia.com';
```

**Résultat attendu:** status = '✅ OK'

### Vérifier les politiques RLS:
```sql
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'investors' AND schemaname = 'public';
```

**Résultat attendu:** Au moins 1 policy permettant `SELECT` pour `authenticated`

---

## 📞 SI PROBLÈME PERSISTE

1. **Vérifier les logs Supabase**
   - Dashboard > Logs > Auth Logs
   - Cherche les erreurs récentes

2. **Tester avec un Magic Link**
   - Dashboard > Authentication > Users
   - Clique sur `eric.dufort@cerdia.com`
   - Clique **Send Magic Link**
   - Vérifie ton email
   - Clique sur le lien pour confirmer que l'auth fonctionne

3. **Vérifier les variables d'environnement**
   - Local: fichier `.env.local` doit avoir:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://svwolnvknfmakgmjhoml.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
     ```
   - Vercel: Dashboard > Settings > Environment Variables

---

## 🎯 RÉSUMÉ

**Étapes minimum:**
1. Créer utilisateur Auth avec email `eric.dufort@cerdia.com`
2. Copier l'UUID généré
3. Lier l'UUID à la table `investors`
4. Tester la connexion

**Fichiers utiles:**
- `supabase/FIX-AUTH-ERIC.sql` - Script de correction complet
- `supabase/SETUP-AUTH.md` - Guide général authentification
- `DEPLOY-VERCEL.md` - Guide déploiement

---

## ✅ APRÈS LA CORRECTION

Une fois connecté, tu auras accès à:
- ✅ **Dashboard** - Vue d'ensemble avec KPIs en temps réel
- ✅ **Projet** - Gestion complète des propriétés immobilières
- ✅ **Administration** - Gestion des investisseurs et documents

Toutes les données sont maintenant synchronisées avec Supabase!
