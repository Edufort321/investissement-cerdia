# 📋 TODO LIST COMPLÈTE - CERDIA Investissement Platform

## 🚀 PRIORITÉ HAUTE (À faire immédiatement)

### 1. ✅ Système Bilingue FR/EN - COMPLÉTÉ
- [x] Créer LanguageContext avec traductions complètes
- [ ] Intégrer LanguageContext dans tous les composants
  - [ ] Dashboard.tsx
  - [ ] ProjetTab.tsx
  - [ ] AdministrationTab.tsx
  - [ ] Navbar.tsx (adapter le LanguageSwitcher existant)
- [ ] Traduire tous les labels, messages, boutons
- [ ] Tester basculement FR/EN en temps réel

### 2. 🌍 Système de Transactions Internationales
- [x] Schéma SQL créé (12-add-international-tax-fields.sql)
- [ ] **Exécuter le script SQL dans Supabase**
- [ ] Étendre `TransactionFormData` interface avec:
  - source_currency, source_amount, exchange_rate
  - source_country, foreign_tax_paid, foreign_tax_rate
  - fiscal_category, vendor_name, accountant_notes
- [ ] Créer formulaire étendu dans AdministrationTab:
  - Dropdown devises (CAD, USD, DOP, EUR, etc.)
  - Input pays source
  - Input taux de change (+ bouton auto-fetch API)
  - Inputs taxes étrangères
  - Input nom vendeur/compagnie
  - Dropdown catégorie fiscale (avec option "Ajouter custom")
  - Zone notes comptable
- [ ] Afficher crédit d'impôt calculé automatiquement (read-only)

### 3. 📎 Upload Multiple de Pièces Jointes
- [x] Table `transaction_attachments` créée
- [ ] Créer composant `TransactionAttachments.tsx`
  - Zone drag & drop pour upload multiple
  - Liste des fichiers uploadés avec preview
  - Boutons télécharger/supprimer
  - Types acceptés: PDF, JPG, PNG, XLS, DOC
- [ ] Intégrer dans le formulaire de transaction
- [ ] Créer bucket Supabase Storage `transaction-attachments`
- [ ] Configurer RLS sur le bucket

### 4. 📊 Catégories OPEX/CAPEX Conformes IFRS
- [ ] Créer enum fiscal_category avec:
  - **OPEX**: management_fee, utilities, insurance, maintenance, property_tax, repairs
  - **CAPEX**: acquisition, renovation, furniture, equipment, improvements
  - **Revenus**: rental_income, other_income
- [ ] Créer dropdown hiérarchique dans formulaire
- [ ] Permettre ajout de catégories custom par projet
- [ ] Créer vue SQL `ifrs_compliance_report`

### 5. 📄 Rapports Comptables et Export PDF
- [ ] Créer composant `ReportsTab.tsx`
  - [ ] Rapport T1135 (Revenus étrangers)
  - [ ] Rapport T2209 (Crédits d'impôt étrangers)
  - [ ] Rapport gains/pertes de change
  - [ ] État OPEX vs CAPEX par projet
  - [ ] P&L par projet
  - [ ] Rapport annuel global
- [ ] Intégrer bibliothèque PDF (jsPDF ou react-pdf)
- [ ] Bouton "Exporter PDF" pour chaque rapport
- [ ] Bouton "Partager avec comptable" (lien sécurisé)

---

## 🔧 PRIORITÉ MOYENNE

### 6. 💰 Simulateur ROI pour Nouveaux Projets
- [ ] Créer composant `ROISimulator.tsx` dans ProjetTab
- [ ] Inputs:
  - Prix d'achat (USD/CAD)
  - Croissance annuelle (%)
  - Revenu mensuel
  - CAPEX initial et récurrent
  - Durée projection (années)
- [ ] Slider liquidation (timing de vente)
- [ ] Graphique comparaison: Scénario vs Réalité
- [ ] Tableau ROI année par année
- [ ] Bouton "Créer projet depuis simulation"

### 7. 📜 Historique Investissements Ligne par Ligne
- [x] Schéma SQL créé (11-add-investment-history.sql)
- [ ] **Exécuter le script SQL dans Supabase**
- [ ] Créer sous-tab "Historique Investissements" dans Administration
- [ ] UI pour ajouter lignes d'investissement:
  - Date, montant, investisseur, description
  - Lien vers transaction si applicable
- [ ] Afficher tableau historique complet
- [ ] Calcul automatique des totaux par investisseur

### 8. 💼 Module CAPEX 2025
- [ ] Finaliser le `renderCapexTab()` dans AdministrationTab
- [ ] Afficher solde CAPEX (investment + operation)
- [ ] Tableau des dépenses CAPEX par projet
- [ ] Graphique évolution CAPEX mensuel
- [ ] Budget vs Réalisé

### 9. 🎯 Module R&D et Dividendes
- [ ] Finaliser `renderRdDividendesTab()` dans AdministrationTab
- [ ] Section R&D:
  - Total CAPEX R&D
  - Liste des projets R&D
- [ ] Section Dividendes:
  - Calcul automatique par investisseur
  - Historique distributions
  - Bouton "Distribuer dividendes"
- [ ] Intégrer vue SQL `rnd_accounts`

### 10. 📱 Optimisation Mobile & Desktop
- [ ] Audit responsive de tous les composants
- [ ] Optimiser tables (scroll horizontal mobile)
- [ ] Optimiser formulaires (stack vertical sur mobile)
- [ ] Tester sur iPhone, Android, iPad, Desktop
- [ ] Optimiser performance (lazy loading images)

---

## 🧪 TESTS & DÉPLOIEMENT

### 11. Tests Complets
- [ ] Tester flow complet: Connexion → Dashboard → Projets → Administration
- [ ] Tester CRUD sur toutes les entités
- [ ] Tester upload/download documents
- [ ] Tester système bilingue
- [ ] Tester RLS (permissions admin vs investisseur)
- [ ] Tester sur navigateurs: Chrome, Firefox, Safari, Edge

### 12. Performance & Sécurité
- [ ] Vérifier toutes les politiques RLS
- [ ] Optimiser queries Supabase (indexes)
- [ ] Compression images
- [ ] Lazy loading composants lourds
- [ ] Audit sécurité (XSS, SQL injection via Supabase)

### 13. Documentation
- [ ] Mettre à jour README.md
- [ ] Documenter toutes les vues SQL
- [ ] Guide utilisateur (FR + EN)
- [ ] Guide comptable (utilisation rapports)

---

## 🚢 DÉPLOIEMENT VERCEL

### 14. Push GitHub et Deploy
- [ ] Commit tous les changements
- [ ] Push vers GitHub
- [ ] Vérifier build Vercel
- [ ] Configurer variables d'environnement Vercel
- [ ] Tester application en production
- [ ] Configurer domaine personnalisé (si applicable)

---

## 📝 SCRIPTS SQL À EXÉCUTER DANS SUPABASE

**IMPORTANT: Ces scripts doivent être exécutés dans l'ordre dans Supabase SQL Editor**

1. ✅ `01-setup-initial.sql` - Setup de base (assumé fait)
2. ✅ `09-add-payment-schedules.sql` - Paiements échelonnés (assumé fait)
3. ✅ `10-add-compte-courant-SIMPLIFIE.sql` - Compte courant (assumé fait)
4. ⚠️ `11-add-investment-history.sql` - **À EXÉCUTER**
5. ⚠️ `12-add-international-tax-fields.sql` - **À EXÉCUTER**

---

## 🎨 AMÉLIORATIONS FUTURES (Post-MVP)

- [ ] Dashboard analytics avancé (Chart.js ou Recharts)
- [ ] Notifications emails (paiements dus, dividendes)
- [ ] Export Excel des rapports
- [ ] API publique pour comptables externes
- [ ] Mode sombre (dark mode)
- [ ] Authentification 2FA
- [ ] Audit log (qui a modifié quoi et quand)
- [ ] Intégration Stripe pour paiements en ligne
- [ ] Chatbot IA pour support investisseurs

---

## 📊 STATUT GLOBAL

**Complété**: ~60%
**En cours**: 25%
**À faire**: 15%

**Estimation temps restant**: 20-30 heures de développement

---

## 🔥 NEXT STEPS (Dans l'ordre)

1. ✅ Créer cette TODO list
2. 🔄 Intégrer système bilingue dans tous les composants
3. 🔄 Exécuter scripts SQL 11 et 12 dans Supabase
4. 🔄 Étendre formulaire transactions (international + attachments)
5. 🔄 Créer rapports comptables
6. 🔄 Push GitHub + Deploy Vercel
7. 🔄 Tests complets

---

**Dernière mise à jour**: 2025-01-19
**Responsable**: Claude AI + Équipe CERDIA
