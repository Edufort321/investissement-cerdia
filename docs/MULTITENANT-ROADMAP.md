# Multi-Tenant Roadmap — Plateforme CERDIA SaaS

Statut au 2026-05-13. Source unique de vérité pour les phases du rollout multi-tenant et les TODOs associés.

## Vision

Transformer la plateforme CERDIA (actuellement single-tenant) en SaaS multi-tenant
commercialisé via le module Commerce CERDIA. Chaque "Organisation" client a sa
propre plateforme isolée, son branding, ses utilisateurs. Eric reste super_admin
en background pour le support technique.

- **Routing** : `cerdia.ai` reste la vitrine marketing. Login unique → redirect direct au dashboard du tenant.
- **Nommage** : Organisation / Organisations (table `organizations`, rôle `org_admin`/`org_user`/`org_investor`/`org_viewer`, Eric = `super_admin`).
- **White-label** : logo + nom organisation injectés dans la navbar.
- **Onboarding** : wizard 5 étapes à la 1ère connexion (société, devise, classes de parts, inviter users, confirmation).
- **Premier tenant** : CERDIA Globale en validation interne (toutes les données existantes y sont rattachées).

---

## Phase 1 — Fondations DB ✅ FAIT

Migrations 145 → 149 appliquées :
- 145 : table `organizations` + seed CERDIA Globale (uuid `c0000000-0000-0000-0000-000000000001`) + helpers (`auth_get_org_id`, `is_super_admin`, `is_org_admin`) + extension `profiles` (organization_id NOT NULL, onboarding_completed, rôles renommés)
- 146 : `organization_id` + FK + index sur les ~56 tables Investissement
- 147 : policy `RESTRICTIVE tenant_isolation` sur ces 56 tables
- 148 : idem pour Commerce + Invoicing (6 tables)
- 149 : idem pour `gmail_invoices` + cleanup des helpers temporaires

Tables `amazon_*` restent CERDIA-only par choix (agent propriétaire CERDIA Voyage).

---

## Phase 2 — Code Next.js tenant-aware 🚧 EN COURS

### 2.1 — OrganizationContext ✅ FAIT
- `contexts/OrganizationContext.tsx` : charge `profiles` + `organizations` au login
- Expose `useOrganization()` avec `organization`, `realOrganization`, `profile`, `isSuperAdmin`, `isViewingAsOther`, `switchOrg`, `clearOverride`, `refresh`
- `super_admin` override stocké dans `localStorage.cerdia_org_override` pour le mode "View as..."

### 2.2 — Branding dynamique 📋 À FAIRE
- Injecter `organization.name` + `organization.logo_url` dans la navbar/sidebar/header
- Fallback CERDIA si pas d'org chargée (loading state ou erreur)
- Préfixe `tenants/{org_id}/` sur les uploads Supabase Storage

### 2.3 — Bandeau "View as..." pour super_admin 📋 À FAIRE
- Si `isViewingAsOther` → bandeau jaune sticky en haut : "🛠️ Support — Tu regardes Organisation XYZ [Quitter le mode support]"
- Bouton `clearOverride()` ramène à la vraie org

### 2.4 — Injection organization_id côté code 📋 À FAIRE
- Toutes les routes API server-side (`/api/admin/*`, `/api/amazon/*`, etc.) et les inserts côté client doivent passer `organization_id` explicitement
- Aujourd'hui le `DEFAULT '<CERDIA>'` DB le fait pour nous, mais on veut être robuste avant d'avoir d'autres tenants
- Retirer le DEFAULT en fin de Phase 2 (migration de cleanup)

### 2.5 — Login flow 📋 À FAIRE
- Après login, le redirect va à `/dashboard` (rien à changer sur le routing)
- Mais : si `profile.onboarding_completed === false` → redirect vers `/onboarding` (le wizard de Phase 4)

---

## Phase 3 — Admin Multi-Tenant (Commerce → Organisations) 📋 À FAIRE

Onglet `/commerce/admin/organisations` visible **seulement pour `super_admin`** (Eric).

### 3.1 — UI de création one-click
Formulaire :
- **Nom de l'organisation** (texte, requis)
- **Slug** (auto-généré depuis le nom, éditable, unique)
- **Email admin** (texte, requis — sera le `org_admin` initial du tenant)
- **Logo** (upload optionnel, fallback CERDIA si vide)
- **Plan** (select : basic / pro / enterprise / demo)
- **Montant annuel CAD** (numérique — billing récurrent, voir 3.3)
- **Date de début de l'abonnement** (date)
- Bouton **[Créer en 1 clic]**

### 3.2 — Route API server-side `/api/admin/organisations/create`
Avec `service_role` pour bypass RLS. En une transaction :
1. INSERT dans `organizations` (uuid + nom + slug + logo + plan + settings par défaut)
2. `supabase.auth.admin.createUser(email, random_password, email_confirm=true)` → récupère le user
3. INSERT dans `profiles` avec `organization_id = nouvel_org_id`, `role = 'org_admin'`, `onboarding_completed = false`
4. Seed des `commerce_platforms` par défaut pour ce tenant (Amazon, Shopify, Etsy, Site web, Autre)
5. **Créer la facture annuelle** (voir 3.3) dans le système `invoices` existant
6. Générer un magic link Supabase (`supabase.auth.admin.generateLink`) → retourne l'URL à Eric
7. Eric peut copier-coller le lien dans un email ou l'envoi est automatisé via Resend/SendGrid (Phase 5)

### 3.3 — Intégration billing (link au système invoices existant)
**Demandé par Eric le 2026-05-13** :

- Quand Eric crée une organisation, il définit un **montant annuel** (CAD)
- Le système **crée automatiquement** une facture via le module `invoices` existant :
  - `organization_id` = CERDIA Globale (CERDIA est l'émetteur de la facture)
  - `invoice_clients.client_organization_id` = nouveau tenant (le destinataire)
  - `invoice_items` = ligne "Abonnement annuel plateforme CERDIA — Plan {plan}"
  - Montant + taxes selon les règles fiscales
  - Date d'émission = aujourd'hui, date d'échéance = +30j
  - Renewal date = +1 an
- **Rappel auto** : 60 jours avant le renewal date → email envoyé au tenant + Eric
  - Implémentation : cron job quotidien (Supabase Edge Functions ou Vercel Cron) qui scanne les organisations dont `next_renewal_date - INTERVAL '60 days' <= NOW()` et qui n'ont pas encore reçu le rappel
- **Blocage automatique** : 30 jours après la date d'échéance de la facture si non payée
  - Cron job met `organizations.status = 'suspended'`
  - Le middleware Next.js ou `OrganizationContext` détecte `status === 'suspended'` et redirige vers `/billing/overdue` (page dédiée)
  - Eric peut débloquer manuellement (`status = 'active'`) après confirmation du paiement
  - Le tenant `org_admin` voit la page de paiement uniquement, pas le dashboard

### 3.4 — Page liste des organisations
- Tableau : nom · plan · status · last_login · prochaine_renewal · MRR
- Actions par ligne : `[Voir comme]` (active le mode View as) · `[Modifier]` · `[Suspendre/Réactiver]` · `[Supprimer (archive)]`
- Filtres : par status (active/suspended/archived), par plan, par date

### 3.5 — Mode "View as..." (UI)
- Le bouton `[Voir comme]` appelle `switchOrg(orgId)` du context → bandeau jaune apparaît partout
- L'app se comporte comme si Eric était dans le tenant cible (data filtrée par leurs RLS)
- Bouton `[Quitter le mode support]` dans le bandeau → `clearOverride()`

### 3.6 — Migrations DB associées à Phase 3
- Migration 150+ : table `subscription_periods` (organization_id, start_date, end_date, amount_cad, invoice_id, status, paid_at) pour tracker l'historique d'abonnement
- Ajout `organizations.next_renewal_date DATE` + `organizations.last_reminder_sent_at TIMESTAMPTZ` + `organizations.annual_amount_cad NUMERIC(12,2)`

---

## Phase 4 — Wizard onboarding tenant 📋 À FAIRE

Page `/onboarding` accessible quand `profile.onboarding_completed === false`.

5 étapes :
1. **Société** : nom légal de l'organisation, adresse, numéro d'entreprise
2. **Devise & juridiction** : devise principale (CAD/USD/EUR/...), juridiction fiscale (CA/US/FR/...)
3. **Classes de parts** (skippable) : ajouter des classes A/B/C avec leurs droits, ou skip si pas applicable
4. **Inviter des users** (skippable) : ajouter des `org_user` / `org_investor` / `org_viewer` initiaux
5. **Confirmation** : recap + bouton "Commencer"

À la fin : `UPDATE profiles SET onboarding_completed = true WHERE id = auth.uid()`.

---

## Phase 5 — Tenant DEMO + commercialisation 📋 À FAIRE

**Spec précisée par Eric le 2026-05-13** :

### Tenant DEMO public
- Création d'un tenant `slug='demo'` avec `is_demo=true`, `plan='demo'`
- **Accès direct sans mot de passe** depuis l'URL publique `cerdia.ai/demo`
- **Édition réservée à Eric** (super_admin) : les visiteurs anonymes voient le contenu en read-only, seul Eric peut le modifier
- Implémentation RLS : nouvelle policy `demo_public_read` qui permet `SELECT` aux users `anon` sur les tables tenant-scoped **uniquement** où `organization_id = (SELECT id FROM organizations WHERE is_demo=true LIMIT 1)`. Les `INSERT/UPDATE/DELETE` restent réservés au super_admin.
- Eric peuple manuellement le tenant DEMO via le mode "View as..." du super_admin (scénarios bidons, propriétés fictives, investisseurs fictifs, transactions historiques, NAV exemple, etc.)

### Onglet "Démo" dans la navbar publique
- Ajouter un lien **"Démo"** dans `components/Navbar.tsx` entre "Commerce" et "Investisseur"
- Pointe vers `/demo` → page qui charge le tenant `is_demo=true` en mode anonyme + render le dashboard standard
- Pour les visiteurs qui arrivent direct sur `cerdia.ai` → ils voient cet onglet et peuvent explorer la démo sans s'inscrire

### Page `/demo`
- Route publique (pas de check d'auth dans le layout)
- Force `organization_id` = demo tenant côté query
- Layout simplifié, sans actions destructives, peut afficher un badge "MODE DÉMO" en haut
- Boutons d'action désactivés / masqués pour les anonymes (UI read-only)

### Autres
- Automatisation Resend/SendGrid pour l'envoi des magic links de bienvenue aux nouveaux tenants
- Stripe pour les paiements (optionnel — pour l'instant facturation manuelle)
- Domain custom par tenant (premium, optionnel)

---

## Phase 6 — Refactor CERDIA-spécifique 📋 À FAIRE

Rendre configurable ce qui est hardcodé pour CERDIA Globale aujourd'hui :
- Classes de parts A/B/C → liste dynamique dans `organizations.settings.share_classes`
- T1135/T2209 (canadien) → optionnel selon `organizations.settings.tax_jurisdiction`
- Devises USD/CAD/DOP/EUR → liste dynamique dans `organizations.settings.currencies_enabled`
- Modules activés (investment / commerce / gmail / amazon) → flags dans `organizations.settings.modules`

---

## Phase 7 — Plateforme 100% bilingue FR/EN 📋 À FAIRE

**Demandé par Eric le 2026-05-13.**

Le `LanguageContext` FR/EN existe déjà (sélecteur de langue dans la navbar). Mais beaucoup de strings UI sont encore hardcodés en français dans les composants. À faire :
- Audit complet : grep des strings français hardcodés dans `app/**/*.tsx` et `components/**/*.tsx`
- Migration vers `t()` du LanguageContext pour chaque label, bouton, placeholder, message d'erreur, toast
- Couvrir aussi les emails (welcome, magic link, invoice reminders, suspension warnings)
- Couvrir les rapports PDF (T1135, NAV, etc.) — version FR + EN selon la préférence du user/tenant
- Tenant settings : `organizations.settings.default_language` (`fr` ou `en`)
- User preference : `profiles.preferred_language` qui override le default tenant
- Important pour la commercialisation : un client anglophone doit pouvoir utiliser 100% de la plateforme sans toucher au français

---

## Notes diverses

### Bug corrigé en mig 150 (2026-05-13)
Mig 147/148/149 ont activé RLS sur les tables et ajouté une policy RESTRICTIVE
`tenant_isolation`. Mais les tables qui n'avaient pas de PERMISSIVE pour
authenticated (ex: commerce_products avec RLS DISABLED depuis mig 129) sont
devenues invisibles aux users authentifiés (RESTRICTIVE seule = deny all).
Mig 150 ajoute `tenant_authenticated_access` PERMISSIVE sur toutes les tables
avec `tenant_isolation`. À se rappeler pour les futures tables tenant-scoped :
toujours ajouter les 2 policies (PERMISSIVE pour autoriser + RESTRICTIVE pour filtrer).
