# 🚀 GUIDE DÉPLOIEMENT GITHUB + VERCEL

## ÉTAPE 1: Créer le repository GitHub

### Option A: Via le site GitHub (recommandé)

1. Va sur https://github.com/new
2. Remplis les informations:
   - **Repository name:** `investissement-cerdia`
   - **Visibility:** Private ✅ (pour ne pas exposer le code)
   - **NE COCHE PAS** "Add README" (on a déjà un commit)
3. Clique **"Create repository"**
4. Tu verras une page avec des instructions, copie l'URL du repo (format: `https://github.com/TON-USERNAME/investissement-cerdia.git`)

### Option B: Si tu as déjà un repo GitHub

Si tu as déjà créé un repo avant, récupère juste son URL.

---

## ÉTAPE 2: Connecter le repo local à GitHub

Ouvre un terminal dans le dossier du projet et exécute:

```bash
cd C:\CERDIA\investissement-cerdia-main

# Remplace TON-USERNAME par ton nom d'utilisateur GitHub
git remote add origin https://github.com/TON-USERNAME/investissement-cerdia.git

# Pousser le code
git push -u origin master
```

✅ **Résultat:** Ton code est maintenant sur GitHub!

---

## ÉTAPE 3: Déployer sur Vercel

### A. Créer un compte Vercel (si pas déjà fait)

1. Va sur https://vercel.com/signup
2. Connecte-toi avec ton compte GitHub
3. Autorise Vercel à accéder à tes repos

### B. Importer le projet

1. Va sur https://vercel.com/new
2. Sélectionne **"Import Git Repository"**
3. Cherche `investissement-cerdia` dans la liste
4. Clique **"Import"**

### C. Configurer les variables d'environnement

**IMPORTANT!** Avant de déployer, ajoute les variables d'environnement Supabase:

1. Dans la page de configuration Vercel, descends jusqu'à **"Environment Variables"**
2. Ajoute ces 2 variables:

```
Nom: NEXT_PUBLIC_SUPABASE_URL
Valeur: https://svwolnvknfmakgmjhoml.supabase.co

Nom: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valeur: eyJhbGc... (copie la clé complète depuis ton .env.local)
```

3. Clique **"Add"** pour chaque variable
4. Assure-toi que les variables sont disponibles pour **Production**, **Preview** et **Development**

### D. Déployer

1. Clique **"Deploy"**
2. Attends 2-3 minutes que le build se termine
3. Tu recevras une URL du type: `https://investissement-cerdia.vercel.app`

---

## ÉTAPE 4: Tester en production

1. Va sur l'URL Vercel
2. Clique sur **"Connexion"** dans le header
3. Connecte-toi avec `eric.dufort@cerdia.com` / `321Eduf!$`
4. Vérifie que le dashboard s'affiche

---

## ⚙️ Configuration supplémentaire

### Domaine personnalisé (optionnel)

Si tu as un domaine (ex: `cerdia.com`):

1. Dans Vercel, va dans **Settings** > **Domains**
2. Ajoute ton domaine
3. Configure les DNS selon les instructions de Vercel

### Redéploiement automatique

Chaque fois que tu push sur GitHub, Vercel redéploiera automatiquement! 🎉

```bash
# Faire des changements dans le code
git add .
git commit -m "feat: ajout dashboard"
git push

# ✅ Vercel redéploie automatiquement!
```

---

## 🐛 DÉPANNAGE

### Erreur: "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Solution:** Tu as oublié d'ajouter les variables d'environnement dans Vercel.

1. Va dans **Settings** > **Environment Variables**
2. Ajoute `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redéploie depuis l'onglet **Deployments** > **Redeploy**

### Erreur de build: "Module not found"

**Solution:** Installe les dépendances manquantes:

```bash
npm install
git add package.json package-lock.json
git commit -m "fix: update dependencies"
git push
```

### La connexion ne fonctionne pas en production

**Vérifications:**

1. Les variables d'environnement Supabase sont bien configurées dans Vercel
2. Les utilisateurs Auth sont créés dans Supabase (voir `supabase/SETUP-AUTH.md`)
3. Les `user_id` dans la table `investors` correspondent aux `id` dans `auth.users`

### L'app fonctionne en local mais pas en production

**Causes possibles:**

1. **Variables d'environnement manquantes** - Vérifie dans Vercel Settings
2. **Build error** - Regarde les logs de build dans Vercel
3. **RLS trop restrictif** - Vérifie les policies dans Supabase

---

## 📝 COMMANDES UTILES

```bash
# Voir le statut git
git status

# Créer un nouveau commit
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push

# Voir l'historique des commits
git log --oneline

# Voir les différences
git diff

# Créer une nouvelle branche
git checkout -b feature/nouvelle-fonctionnalite
```

---

## ✅ CHECKLIST POST-DÉPLOIEMENT

- [ ] Code poussé sur GitHub
- [ ] Projet importé dans Vercel
- [ ] Variables d'environnement Supabase configurées
- [ ] Build réussi
- [ ] Connexion testée en production
- [ ] Dashboard accessible
- [ ] Domaine personnalisé configuré (optionnel)

---

## 🔗 LIENS RAPIDES

- **GitHub Repo:** https://github.com/TON-USERNAME/investissement-cerdia
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://svwolnvknfmakgmjhoml.supabase.co
- **App en production:** https://investissement-cerdia.vercel.app

---

**Prochaine étape après le déploiement:** Recréer le Dashboard avec les données Supabase! 🎯
