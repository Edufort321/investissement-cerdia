# 🏢 CERDIA Investment Platform

Plateforme complète de gestion d'investissements immobiliers avec suivi fiscal international, performance ROI, et rapports automatisés.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.1.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

---

## ✨ Fonctionnalités Principales

### 📊 Dashboard
- Vue d'ensemble en temps réel
- Statistiques d'investissement globales
- Graphiques de performance
- Alertes et notifications

### 🏠 Gestion de Projets
- CRUD complet des propriétés
- Photos et documents par projet
- Calendriers de paiement échelonnés
- Statut et suivi de progression
- ROI attendu vs réel

### 👥 Gestion d'Investisseurs
- Profils détaillés
- Structure de parts (Classe A, B, C)
- Pourcentage de propriété
- Documents personnels sécurisés
- Historique des transactions

### 💰 Transactions
- Types: Investissement, Paiement, Dividende, Dépense
- **Fiscalité Internationale:**
  - Support multi-devises (CAD, USD, DOP, EUR)
  - Calcul automatique taux de change
  - Impôts étrangers payés
  - Crédit d'impôt réclamable
  - Catégorisation fiscale (T1135, T2209)
- Pièces jointes (factures, reçus)
- Filtres avancés

### 📈 Compte Courant
- Vue mensuelle agrégée
- Détails par projet
- Catégorisation automatique:
  - **Revenus:** Locatif, Autres
  - **Coûts d'Opération:** Gestion, Services, Assurances, Maintenance, Taxes
  - **Dépenses Projet:** Rénovations, Ameublement, CAPEX
- Revenu net calculé automatiquement

### 📋 Rapports Fiscaux
- **T1135** - Bilan de vérification du revenu étranger
  - Par pays (République Dominicaine, USA, etc.)
  - Par type (Biens immobiliers, Placements)
  - Export PDF professionnel
- **T2209** - Crédits fédéraux pour impôt étranger
  - Revenus étrangers de source non commerciale
  - Impôts payés à l'étranger
  - Calcul crédit réclamable
  - Export PDF

### 🎯 Performance ROI
- Calcul ROI réel vs attendu
- Annualisation automatique
- **Statuts de Performance:**
  - 🟢 Excellent (>20% au-dessus objectif)
  - 🔵 Bon (±10% de l'objectif)
  - 🟡 Attention (10-30% sous objectif)
  - 🔴 Critique (>30% sous objectif)
  - ⏳ En attente (<3 mois de données)
- Alertes visuelles automatiques
- Filtres par statut

### 🌍 International
- Interface bilingue (Français/English)
- Support multi-devises
- Conformité fiscale Canada-DR

---

## 🛠️ Stack Technique

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **PDF Export:** jsPDF

### Backend
- **BaaS:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **RLS:** Row Level Security

### Deployment
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **CDN:** Vercel Edge Network

---

## 📦 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase
- Compte Vercel (optionnel)

### 1. Cloner le Projet

```bash
git clone https://github.com/[username]/cerdia-platform.git
cd cerdia-platform
```

### 2. Installer les Dépendances

```bash
npm install
```

### 3. Configuration Environnement

Créer `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[ton-projet].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Setup Base de Données

Suivre **[DEPLOYMENT-GUIDE.md](./supabase/DEPLOYMENT-GUIDE.md)** pour:
1. Créer projet Supabase
2. Exécuter scripts SQL (1-13)
3. Configurer Storage buckets

### 5. Lancer en Développement

```bash
npm run dev
```

Ouvrir http://localhost:3000

---

## 📁 Structure du Projet

```
cerdia-platform/
├── app/                    # Next.js App Router
│   ├── connexion/         # Page de connexion
│   ├── dashboard/         # Application principale
│   └── layout.tsx         # Layout global
├── components/            # Composants React
│   ├── DashboardTab.tsx
│   ├── ProjetTab.tsx
│   ├── AdministrationTab.tsx
│   ├── PerformanceTracker.tsx
│   ├── TaxReports.tsx
│   ├── TransactionAttachments.tsx
│   └── ProjectAttachments.tsx
├── contexts/              # React Contexts
│   ├── InvestmentContext.tsx
│   └── LanguageContext.tsx
├── lib/                   # Utilitaires
│   └── supabase.ts
├── supabase/              # Scripts SQL
│   ├── 1-cleanup.sql
│   ├── 2-create-tables.sql
│   ├── ...
│   ├── 13-add-roi-performance-tracking.sql
│   ├── 99-reset-all-data.sql
│   ├── DEPLOYMENT-GUIDE.md
│   └── SETUP-AUTH.md
└── public/                # Assets statiques
```

---

## 🚀 Déploiement Production

Consulter **[DEPLOYMENT-GUIDE.md](./supabase/DEPLOYMENT-GUIDE.md)** pour:
- Setup Supabase complet
- Déploiement Vercel
- Configuration DNS
- Instructions pour vendre/transférer l'app

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/[username]/cerdia-platform)

---

## 📚 Documentation

- **[DEPLOYMENT-GUIDE.md](./supabase/DEPLOYMENT-GUIDE.md)** - Guide complet de déploiement
- **[INSTRUCTIONS.md](./supabase/INSTRUCTIONS.md)** - Instructions setup Supabase
- **[SETUP-AUTH.md](./supabase/SETUP-AUTH.md)** - Configuration authentification

---

## 🧪 Tests

```bash
# Linter
npm run lint

# Type checking
npx tsc --noEmit

# Build de production
npm run build
```

---

## 🔒 Sécurité

- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ Authentification Supabase (Email + Magic Link)
- ✅ Storage policies sécurisées
- ✅ Variables d'environnement pour secrets
- ✅ Validation des inputs côté client et serveur
- ✅ HTTPS obligatoire en production

---

## 📊 Performance

- ⚡ Next.js 14 avec Server Components
- ⚡ Images optimisées (next/image)
- ⚡ Code splitting automatique
- ⚡ Edge caching via Vercel
- ⚡ Database indexes optimisés
- ⚡ PostgreSQL views pour agrégations

---

## 🌍 Internationalisation

Support complet Français/English:
- Interface UI complète
- Formats de date/nombres localisés
- Formats de devise (CAD, USD, DOP, EUR)
- Messages d'erreur traduits

---

## 🔄 Versions

### Version 1.0.0 (Octobre 2025)
- ✅ Base de données complète (20+ tables)
- ✅ Gestion investisseurs et projets
- ✅ Transactions avec fiscalité internationale
- ✅ Compte courant mensuel
- ✅ Rapports fiscaux T1135 et T2209
- ✅ Suivi performance ROI avec alertes
- ✅ Upload fichiers multi-catégories
- ✅ Support multi-devises
- ✅ Bilingue FR/EN

### Roadmap Future
- [ ] Dashboard personnalisable
- [ ] Notifications par email
- [ ] API REST publique
- [ ] Mobile app (React Native)
- [ ] Multi-tenant (SaaS)
- [ ] Intégration Stripe
- [ ] Rapports Excel export
- [ ] Graphiques avancés (Chart.js)

---

## 📝 License

**Propriétaire** - Tous droits réservés © 2025 CERDIA

---

## 👨‍💻 Auteurs

- **Équipe CERDIA** - Développement initial

---

**Made with ❤️ in Canada 🍁**
