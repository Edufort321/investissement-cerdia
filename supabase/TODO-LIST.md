# ✅ TODO LIST - Installation CERDIA Investment Platform

Cette checklist vous guide dans l'installation complète de la plateforme CERDIA, de la base de données au déploiement en production.

---

## 📋 PHASE 1: PRÉPARATION

### Comptes et Accès

- [ ] **Créer compte Supabase** (gratuit)
  - Allez sur https://supabase.com
  - Créer un compte
  - Vérifier l'email

- [ ] **Créer projet Supabase**
  - Nom: `cerdia-investment` (ou votre choix)
  - Région: Choisir la plus proche (ex: US East, Europe West)
  - Mot de passe DB: **Sauvegarder dans gestionnaire de mots de passe**
  - Attendre 2 minutes (création du projet)

- [ ] **Créer compte Vercel** (gratuit)
  - Allez sur https://vercel.com
  - Connecter avec GitHub
  - Autoriser l'accès

- [ ] **Créer compte GitHub** (si pas déjà fait)
  - Allez sur https://github.com
  - Créer un compte

---

## 📋 PHASE 2: BASE DE DONNÉES

### Configuration Supabase Storage

📖 **Guide:** [`guides/SETUP-STORAGE.md`](guides/SETUP-STORAGE.md)

- [ ] **Créer bucket `documents`**
  - Type: Public
  - Limite: 50 MB

- [ ] **Créer bucket `transaction-attachments`**
  - Type: Privé
  - Limite: 50 MB

- [ ] **Créer bucket `property-attachments`**
  - Type: Privé
  - Limite: 50 MB

### Installation SQL - Scripts de Base (1-7)

📖 **Guide:** [`guides/INSTALLATION-COMPLETE.md`](guides/INSTALLATION-COMPLETE.md)

- [ ] **Script 1: Nettoyage** (`1-cleanup.sql`)
  - Ouvrir Supabase SQL Editor
  - Copier/coller le script
  - Exécuter (RUN)
  - Vérifier message: ✅ `NETTOYAGE TERMINÉ`

- [ ] **Script 2: Tables principales** (`2-create-tables.sql`)
  - Nouvelle requête SQL
  - Copier/coller le script
  - Exécuter
  - Vérifier message: ✅ `11 TABLES CRÉÉES`

- [ ] **Script 3: Index** (`3-create-indexes.sql`)
  - Nouvelle requête SQL
  - Copier/coller le script
  - Exécuter
  - Vérifier message: ✅ `INDEXES CRÉÉS`

- [ ] **Script 4: Triggers** (`4-create-triggers.sql`)
  - Nouvelle requête SQL
  - Copier/coller le script
  - Exécuter
  - Vérifier message: ✅ `TRIGGERS ET FONCTIONS CRÉÉS`

- [ ] **Script 5: Sécurité RLS** (`5-enable-rls.sql`)
  - Nouvelle requête SQL
  - Copier/coller le script
  - Exécuter
  - Vérifier message: ✅ `RLS ACTIVÉ`

- [ ] **Script 6: Données de test** (`6-insert-data.sql`)
  - Nouvelle requête SQL
  - Copier/coller le script
  - Exécuter
  - Vérifier message: ✅ `DONNÉES INSÉRÉES`

- [ ] **Script 7: Storage policies** (`7-storage-policies.sql`)
  - Nouvelle requête SQL
  - Copier/coller le script
  - Exécuter
  - Vérifier message: ✅ `STORAGE CONFIGURÉ`

### Installation SQL - Extensions (8-19)

- [ ] **Script 8:** Multi-devises (`8-add-currency-support.sql`)
- [ ] **Script 9:** Calendriers paiement (`9-add-payment-schedules.sql`)
- [ ] **Script 10:** Comptes courants (`10-add-compte-courant-SIMPLIFIE.sql`)
- [ ] **Script 11:** Pièces jointes projets (`11-add-property-attachments.sql`)
- [ ] **Script 12:** Fiscalité internationale (`12-add-international-tax-fields.sql`)
- [ ] **Script 13:** Suivi ROI (`13-add-roi-performance-tracking.sql`)
- [ ] **Script 14:** Amélioration paiements (`14-enhance-payment-schedules.sql`)
- [ ] **Script 15:** Lien paiements-transactions (`15-link-payments-to-transactions.sql`)
- [ ] **Script 16:** Frais et taux (`16-add-transaction-fees-and-effective-rate.sql`)
- [ ] **Script 17:** Storage policies avancées (`17-setup-storage-policies.sql`)
- [ ] **Script 18:** Système de parts (`18-create-investor-investments.sql`)
- [ ] **Script 19:** Paramètres globaux (`19-create-company-settings.sql`)

### Vérification Base de Données

- [ ] **Vérifier nombre de tables**
  ```sql
  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
  -- Attendu: 20+ tables
  ```

- [ ] **Vérifier les vues**
  ```sql
  SELECT table_name FROM information_schema.views WHERE table_schema = 'public';
  -- Attendu: 6 vues
  ```

- [ ] **Vérifier les buckets**
  ```sql
  SELECT * FROM storage.buckets;
  -- Attendu: 3 buckets
  ```

---

## 📋 PHASE 3: AUTHENTIFICATION

📖 **Guide:** [`guides/SETUP-AUTH.md`](guides/SETUP-AUTH.md)

### Créer les utilisateurs Auth

- [ ] **Utilisateur 1: Éric Dufort (Admin)**
  - Email: `eric.dufort@cerdia.com`
  - Password: `321Eduf!$`
  - Auto Confirm: ✅ Oui
  - Copier UUID généré

- [ ] **Utilisateur 2: Chad Rodrigue**
  - Email: `chad.rodrigue@cerdia.com`
  - Password: (votre choix)
  - Auto Confirm: ✅ Oui
  - Copier UUID généré

- [ ] **Utilisateur 3: Alexandre Toulouse**
  - Email: `alexandre.toulouse@cerdia.com`
  - Password: (votre choix)
  - Auto Confirm: ✅ Oui
  - Copier UUID généré

- [ ] **Utilisateur 4: Pierre Dufort**
  - Email: `pierre.dufort@cerdia.com`
  - Password: (votre choix)
  - Auto Confirm: ✅ Oui
  - Copier UUID généré

### Lier Auth ↔ Investors

- [ ] **Lier les user_id**
  ```sql
  -- Obtenir les UUIDs
  SELECT id, email FROM auth.users ORDER BY email;

  -- Mettre à jour (remplacer UUID_XXX par les vrais UUIDs)
  UPDATE investors SET user_id = 'UUID_ERIC' WHERE email = 'eric.dufort@cerdia.com';
  UPDATE investors SET user_id = 'UUID_CHAD' WHERE email = 'chad.rodrigue@cerdia.com';
  UPDATE investors SET user_id = 'UUID_ALEXANDRE' WHERE email = 'alexandre.toulouse@cerdia.com';
  UPDATE investors SET user_id = 'UUID_PIERRE' WHERE email = 'pierre.dufort@cerdia.com';
  ```

- [ ] **Vérifier la liaison**
  ```sql
  SELECT i.first_name, i.last_name, i.email, u.email as auth_email
  FROM investors i
  LEFT JOIN auth.users u ON i.user_id = u.id;
  -- Vérifier que auth_email correspond à i.email
  ```

---

## 📋 PHASE 4: APPLICATION LOCAL

### Configuration Environnement

- [ ] **Récupérer credentials Supabase**
  - Aller dans Supabase → Settings → API
  - Copier `Project URL`
  - Copier `anon public key`

- [ ] **Créer `.env.local`**
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://[votre-projet].supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
  OPENAI_API_KEY=sk-... (optionnel pour IA)
  ```

- [ ] **Installer les dépendances**
  ```bash
  npm install
  ```

### Test en Local

- [ ] **Démarrer serveur dev**
  ```bash
  npm run dev
  ```

- [ ] **Tester page d'accueil**
  - Ouvrir http://localhost:3000
  - Vérifier que la page se charge

- [ ] **Tester connexion**
  - Aller sur http://localhost:3000/connexion
  - Taper "Eric"
  - Sélectionner "Éric Dufort"
  - Entrer password: `321Eduf!$`
  - Cliquer "Se connecter"
  - Vérifier redirection vers `/dashboard`

- [ ] **Tester dashboard**
  - Vérifier affichage des KPIs
  - Vérifier affichage des propriétés
  - Vérifier affichage des investisseurs

- [ ] **Tester onglet Projets**
  - Vérifier liste des propriétés
  - Tester création propriété
  - Tester upload photo

- [ ] **Tester onglet Administration**
  - Vérifier liste investisseurs
  - Vérifier liste transactions
  - Tester export PDF (T1135, T2209)

---

## 📋 PHASE 5: PROGRESSIVE WEB APP (PWA)

📖 **Guide:** [`guides/INSTALLATION-PWA.md`](guides/INSTALLATION-PWA.md)

### Configuration PWA

- [ ] **Vérifier `manifest.json`**
  - Fichier existe dans `public/`
  - Nom: "CERDIA Investment Platform"
  - Icônes configurées

- [ ] **Vérifier icônes PWA**
  - `public/icon-192x192.png` existe
  - `public/icon-512x512.png` existe

- [ ] **Vérifier Service Worker**
  - `public/sw.js` généré automatiquement
  - Configuration dans `next.config.js`

### Test PWA Local

- [ ] **Test installation desktop (Chrome)**
  - Ouvrir http://localhost:3000
  - Vérifier icône ➕ dans barre d'adresse
  - Cliquer et installer
  - Vérifier ouverture en standalone

- [ ] **Test mode hors-ligne**
  - Visiter plusieurs pages
  - Activer "Offline" dans DevTools
  - Rafraîchir la page
  - Vérifier que ça fonctionne

---

## 📋 PHASE 6: DÉPLOIEMENT PRODUCTION

📖 **Guide:** [`guides/DEPLOYMENT-GUIDE.md`](guides/DEPLOYMENT-GUIDE.md)

### Préparation Git

- [ ] **Initialiser Git**
  ```bash
  git init
  git add .
  git commit -m "Initial commit - CERDIA Platform v1.0"
  ```

- [ ] **Créer repo GitHub**
  - Nom: `cerdia-investment-platform` (privé)
  - Ne pas initialiser avec README

- [ ] **Push vers GitHub**
  ```bash
  git remote add origin https://github.com/[username]/cerdia-platform.git
  git branch -M main
  git push -u origin main
  ```

### Déploiement Vercel

- [ ] **Connecter repo à Vercel**
  - Aller sur https://vercel.com
  - Cliquer "Import Project"
  - Sélectionner repo GitHub

- [ ] **Configurer variables d'environnement**
  - Ajouter `NEXT_PUBLIC_SUPABASE_URL`
  - Ajouter `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Ajouter `OPENAI_API_KEY` (optionnel)

- [ ] **Déployer**
  - Cliquer "Deploy"
  - Attendre ~2 minutes
  - Noter l'URL: `https://[votre-app].vercel.app`

### Configuration Domaine (Optionnel)

- [ ] **Acheter domaine**
  - Ex: `app.cerdia.com`

- [ ] **Configurer DNS**
  - Vercel Dashboard → Settings → Domains
  - Ajouter domaine personnalisé
  - Configurer A/CNAME selon instructions

---

## 📋 PHASE 7: TESTS PRODUCTION

### Tests Fonctionnels

- [ ] **Test connexion production**
  - Ouvrir https://[votre-app].vercel.app/connexion
  - Se connecter avec Éric Dufort
  - Vérifier redirection dashboard

- [ ] **Test dashboard**
  - Vérifier affichage KPIs
  - Vérifier affichage propriétés
  - Vérifier affichage investisseurs

- [ ] **Test création données**
  - Créer un investisseur
  - Créer une transaction
  - Créer une propriété
  - Uploader un fichier

- [ ] **Test multi-langue**
  - Cliquer "EN" dans navbar
  - Vérifier traduction
  - Revenir à "FR"

- [ ] **Test PWA production**
  - Installer l'app sur desktop
  - Installer l'app sur mobile
  - Tester mode hors-ligne

### Tests Performance

- [ ] **Lighthouse Audit**
  ```bash
  npx lighthouse https://[votre-app].vercel.app --view
  ```
  - Performance: > 80
  - Accessibility: > 90
  - Best Practices: > 90
  - SEO: > 80
  - PWA: > 90

- [ ] **Test responsive**
  - Desktop 1920x1080
  - Tablet 768x1024
  - Mobile 375x667

---

## 📋 PHASE 8: FINALISATION

### Documentation

- [ ] **Créer documentation utilisateur**
  - Guide connexion
  - Guide utilisation dashboard
  - Guide ajout investisseur
  - Guide ajout transaction
  - Guide export PDF

- [ ] **Créer guide administrateur**
  - Gestion utilisateurs
  - Gestion permissions
  - Backup base de données
  - Monitoring

### Sécurité

- [ ] **Vérifier RLS policies**
  - Tester avec compte non-admin
  - Vérifier isolation des données

- [ ] **Vérifier variables d'environnement**
  - Aucun secret dans le code
  - Aucun `.env.local` dans Git

- [ ] **Configurer alertes**
  - Vercel: Alertes downtime
  - Supabase: Alertes quota DB

### Backup

- [ ] **Configurer backup Supabase**
  - Supabase Dashboard → Settings → Backups
  - Activer backups automatiques

- [ ] **Exporter structure SQL**
  ```bash
  # Garder une copie locale de tous les scripts 1-19
  ```

---

## ✅ CHECKLIST FINALE

- [ ] Base de données installée (scripts 1-19) ✅
- [ ] Authentification configurée ✅
- [ ] Application testée en local ✅
- [ ] PWA configurée et testée ✅
- [ ] Déployée sur Vercel ✅
- [ ] Tests production réussis ✅
- [ ] Performance optimale (Lighthouse > 80) ✅
- [ ] Documentation créée ✅
- [ ] Backups configurés ✅

---

## 🎉 FÉLICITATIONS!

Votre plateforme CERDIA Investment est maintenant **opérationnelle en production** ! 🚀

### Prochaines étapes recommandées:

1. **Former les utilisateurs**
   - Session de formation dashboard
   - Guide d'utilisation PDF

2. **Monitorer l'usage**
   - Vercel Analytics
   - Supabase Database Metrics

3. **Collecter feedback**
   - Créer formulaire feedback
   - Itérer sur les améliorations

4. **Planifier évolutions**
   - Nouvelles fonctionnalités
   - Optimisations performance

---

## 📞 RESSOURCES

| Documentation | Lien |
|---------------|------|
| Installation SQL | [`guides/INSTALLATION-COMPLETE.md`](guides/INSTALLATION-COMPLETE.md) |
| Setup Storage | [`guides/SETUP-STORAGE.md`](guides/SETUP-STORAGE.md) |
| Setup Auth | [`guides/SETUP-AUTH.md`](guides/SETUP-AUTH.md) |
| Installation PWA | [`guides/INSTALLATION-PWA.md`](guides/INSTALLATION-PWA.md) |
| Déploiement | [`guides/DEPLOYMENT-GUIDE.md`](guides/DEPLOYMENT-GUIDE.md) |
| Système de parts | [`guides/EXECUTE-SHARE-SYSTEM.md`](guides/EXECUTE-SHARE-SYSTEM.md) |

**Support externe:**
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Vercel Docs: https://vercel.com/docs

---

**Version:** 1.0
**Dernière mise à jour:** Octobre 2025
**Auteur:** Équipe CERDIA
