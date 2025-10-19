# 🚀 GUIDE COMPLET DE DÉPLOIEMENT - CERDIA Platform

## 📚 TABLE DES MATIÈRES
1. [Scripts de Migration SQL](#scripts-de-migration-sql)
2. [Configuration Supabase](#configuration-supabase)
3. [Déploiement Vercel](#déploiement-vercel)
4. [Instructions pour Vendre/Transférer](#instructions-pour-vendretransférer)
5. [Vérifications Finales](#vérifications-finales)

---

## 🗄️ SCRIPTS DE MIGRATION SQL

### 📁 Ordre d'Exécution (Dans Supabase SQL Editor)

Exécutez ces scripts **dans l'ordre exact** via Supabase Dashboard → SQL Editor:

```
SCRIPTS DE BASE (Initial Setup)
1️⃣  1-cleanup.sql                      → Nettoie la base de données
2️⃣  2-create-tables.sql                → Crée les 11 tables principales
3️⃣  3-create-indexes.sql               → Ajoute les indexes de performance
4️⃣  4-create-triggers.sql              → Crée triggers et fonctions
5️⃣  5-enable-rls.sql                   → Active Row Level Security
6️⃣  6-insert-data.sql                  → Insère données de test (optionnel)
7️⃣  7-storage-policies.sql             → Configure Storage policies

FONCTIONNALITÉS AVANCÉES (Extensions)
8️⃣  8-add-currency-support.sql         → Support multi-devises (USD, CAD, DOP, EUR)
9️⃣  9-add-payment-schedules.sql        → Calendriers de paiement échelonnés
🔟 10-add-compte-courant-SIMPLIFIE.sql → Compte courant mensuel et par projet
1️⃣1️⃣ 11-add-property-attachments.sql    → Pièces jointes projets (photos, docs)
1️⃣2️⃣ 12-add-international-tax-fields.sql → Champs fiscalité internationale (T1135, T2209)
1️⃣3️⃣ 13-add-roi-performance-tracking.sql → Suivi performance ROI avec alertes

UTILITAIRES
9️⃣9️⃣ 99-reset-all-data.sql              → Vide toutes les données (garde la structure)
```

---

## ⚙️ CONFIGURATION SUPABASE

### 1. Créer un Projet Supabase

1. Va sur https://supabase.com
2. Clique **New Project**
3. Nomme-le: `cerdia-production` (ou ton choix)
4. Choisis une région proche de tes utilisateurs
5. Crée un mot de passe **fort** pour la DB
6. Attends ~2 minutes que le projet soit prêt

### 2. Exécuter les Scripts SQL

**Option A: Setup Initial Complet** (Pour nouvelle DB)
```bash
# Dans Supabase SQL Editor, exécute dans l'ordre:
1. 1-cleanup.sql
2. 2-create-tables.sql
3. 3-create-indexes.sql
4. 4-create-triggers.sql
5. 5-enable-rls.sql
6. 6-insert-data.sql (optionnel - données de test)
7. 7-storage-policies.sql
8. 8-add-currency-support.sql
9. 9-add-payment-schedules.sql
10. 10-add-compte-courant-SIMPLIFIE.sql
11. 11-add-property-attachments.sql
12. 12-add-international-tax-fields.sql
13. 13-add-roi-performance-tracking.sql
```

**Option B: Setup Production** (Sans données de test)
```bash
# Saute l'étape 6-insert-data.sql
# Exécute tous les autres scripts 1-5, 7-13
```

### 3. Configurer Storage Buckets

Les buckets suivants seront créés automatiquement par les scripts:
- `documents` → Documents investisseurs
- `transaction-attachments` → Pièces jointes transactions
- `property-attachments` → Photos et documents projets

**Vérification manuelle:**
1. Va dans **Storage** dans Supabase Dashboard
2. Vérifie que les 3 buckets existent
3. Confirme que les policies sont actives (icône 🔒)

### 4. Récupérer les Credentials

Dans **Settings → API**:
- ✅ **Project URL**: `https://[ton-projet].supabase.co`
- ✅ **anon/public key**: `eyJhbGc...` (clé publique)
- ✅ **service_role key**: `eyJhbGc...` (clé privée - **NE JAMAIS EXPOSER**)

---

## 🌐 DÉPLOIEMENT VERCEL

### 1. Préparer le Repository

```bash
# Initialize git (si pas déjà fait)
git init
git add .
git commit -m "Initial commit - CERDIA Platform v1.0"

# Créer un repo GitHub privé
# Push le code
git remote add origin https://github.com/[ton-username]/cerdia-platform.git
git branch -M main
git push -u origin main
```

### 2. Déployer sur Vercel

1. Va sur https://vercel.com
2. Clique **Import Project**
3. Connecte ton repo GitHub
4. Configure les **Environment Variables**:

```env
# Copie ces variables dans Vercel Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://[ton-projet].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# ⚠️ NE PAS ajouter service_role key dans NEXT_PUBLIC_*
```

5. Clique **Deploy**
6. Attends ~2 minutes

### 3. Configurer le Domaine (Optionnel)

Dans Vercel Dashboard → Settings → Domains:
- Ajoute ton domaine personnalisé (ex: `app.cerdia.com`)
- Configure DNS selon instructions Vercel

---

## 💰 INSTRUCTIONS POUR VENDRE/TRANSFÉRER

### Scénario 1: Vendre l'Application Complète

**Livrables à fournir au client:**

1. **Code Source**
   - Repo GitHub complet (ou archive .zip)
   - Accès en propriétaire au repository

2. **Documentation**
   - Ce guide (DEPLOYMENT-GUIDE.md)
   - SETUP-AUTH.md (configuration authentification)
   - README.md du projet

3. **Scripts SQL**
   - Dossier `/supabase` complet (1-13 + 99)
   - Instructions d'exécution dans l'ordre

4. **Variables d'Environnement**
   - Template `.env.example` avec:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://[A-CONFIGURER].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[A-CONFIGURER]
   ```

5. **Guide de Déploiement pour le Client**
   - Créer compte Supabase (gratuit jusqu'à 500MB DB)
   - Exécuter scripts SQL
   - Déployer sur Vercel (gratuit pour 1 projet)

**Checklist Avant Transfert:**
- [ ] Supprimer toutes données sensibles/test
- [ ] Exécuter `99-reset-all-data.sql` sur DB de développement
- [ ] Vérifier que `.env.local` n'est PAS dans le repo (dans `.gitignore`)
- [ ] Tester déploiement complet sur nouveau compte Supabase
- [ ] Documenter toutes les features dans README

### Scénario 2: Déploiement SaaS (Multi-tenant)

**Modifications nécessaires:**

1. **Architecture Base de Données**
   - Ajouter colonne `organization_id` à toutes les tables
   - Modifier RLS policies pour isolation par organization
   - Créer table `organizations`

2. **Authentification**
   - Implémenter système d'inscription
   - Ajouter plans de pricing (Starter, Pro, Enterprise)
   - Intégrer Stripe pour paiements

3. **Limites par Plan**
   - Starter: 1 projet, 3 investisseurs
   - Pro: 10 projets, 50 investisseurs
   - Enterprise: Illimité

### Scénario 3: Licence White-Label

**Fichiers à Personnaliser:**
- `app/layout.tsx` → Logo et nom de marque
- `tailwind.config.ts` → Couleurs de marque
- `public/` → Favicon, logos, images

**Variables de Branding:**
```typescript
// Créer config/branding.ts
export const BRAND = {
  name: "CERDIA", // Personnalisable
  logo: "/logo.svg",
  primaryColor: "#5e5e5e",
  // ... autres configs
}
```

---

## ✅ VÉRIFICATIONS FINALES

### 1. Vérification Base de Données

```sql
-- Exécute dans Supabase SQL Editor

-- 1. Vérifier toutes les tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Attendu: 20+ tables (11 de base + extensions)

-- 2. Vérifier les vues
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';

-- Attendu: summary_view, compte_courant_mensuel,
--          compte_courant_par_projet, property_performance

-- 3. Vérifier Storage buckets
SELECT * FROM storage.buckets;

-- Attendu: documents, transaction-attachments, property-attachments

-- 4. Vérifier RLS activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Attendu: rowsecurity = true pour toutes les tables
```

### 2. Vérification Application

**Checklist Fonctionnalités:**
- [ ] ✅ Connexion utilisateur fonctionne
- [ ] ✅ Dashboard affiche statistiques
- [ ] ✅ Onglet Projets: CRUD complet + attachments
- [ ] ✅ Onglet Administration:
  - [ ] Gestion investisseurs
  - [ ] Transactions avec champs fiscaux
  - [ ] Compte Courant mensuel
  - [ ] Rapports fiscaux (T1135, T2209) avec export PDF
  - [ ] Performance ROI avec alertes
- [ ] ✅ Upload fichiers fonctionne (tous buckets)
- [ ] ✅ Multi-langues (FR/EN) fonctionne
- [ ] ✅ Responsive mobile/desktop

### 3. Tests de Performance

```bash
# Tester temps de chargement
curl -w "@curl-format.txt" -o /dev/null -s "https://[ton-app].vercel.app"

# Lighthouse audit
npx lighthouse https://[ton-app].vercel.app --view
```

**Scores attendus:**
- Performance: >80
- Accessibility: >90
- Best Practices: >90
- SEO: >80

---

## 📞 SUPPORT POST-DÉPLOIEMENT

### Problèmes Courants

**1. Erreur "Could not connect to Supabase"**
- Vérifier NEXT_PUBLIC_SUPABASE_URL dans Vercel
- Vérifier NEXT_PUBLIC_SUPABASE_ANON_KEY
- Redéployer après modification env vars

**2. Upload fichiers échoue**
- Vérifier Storage policies sont actives
- Vérifier buckets existent
- Vérifier RLS sur table `storage.objects`

**3. Données n'apparaissent pas**
- Vérifier RLS policies
- Tester avec service_role key (en dev seulement!)
- Vérifier logs dans Supabase Dashboard

### Logs et Monitoring

**Supabase:**
- Dashboard → Logs → API Logs
- Dashboard → Logs → Database Logs

**Vercel:**
- Dashboard → Deployments → [Latest] → Logs
- Dashboard → Analytics (performance metrics)

---

## 🎉 FÉLICITATIONS!

Votre plateforme CERDIA est maintenant déployée! 🚀

**Next Steps:**
1. Tester toutes les fonctionnalités en production
2. Inviter les premiers utilisateurs
3. Monitorer les performances
4. Collecter feedback utilisateurs
5. Itérer et améliorer

**Besoin d'aide?**
- Documentation Next.js: https://nextjs.org/docs
- Documentation Supabase: https://supabase.com/docs
- Documentation Vercel: https://vercel.com/docs

---

**Version:** 1.0
**Dernière mise à jour:** Octobre 2025
**Auteur:** Équipe CERDIA
**License:** Propriétaire
