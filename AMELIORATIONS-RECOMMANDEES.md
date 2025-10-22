# 🚀 PLAN D'AMÉLIORATION - CERDIA INVESTISSEMENT
## Système de Gestion Avancé & Contrôle de Trésorerie

**Date:** 2025-10-21
**Version actuelle:** 1.0.0 - Production
**Version cible:** 2.0.0 - Enterprise Grade

---

## 📊 ANALYSE DE L'ÉTAT ACTUEL

### ✅ Forces Actuelles
- Architecture solide (Next.js 14 + Supabase)
- Système de vote et évaluation de projets fonctionnel
- Multi-devises avec rapports fiscaux (T1135/T2209)
- Système de parts/actions
- Calendrier de réservations unifié
- Partage sécurisé de projets
- Bilingue FR/EN complet
- PWA installable

### ⚠️ Lacunes Identifiées

#### 1. TRÉSORERIE & FLUX DE TRÉSORERIE
- ❌ Pas de prévisions de trésorerie (cash flow forecast)
- ❌ Pas de rapprochement bancaire automatique
- ❌ Pas de tableau de trésorerie mensuel/hebdomadaire
- ❌ Pas d'alertes de seuils critiques de liquidité
- ❌ Pas de gestion des fournisseurs (comptes payables)
- ❌ Pas de gestion des recevables (comptes clients)
- ❌ Virement bancaire non intégré

#### 2. GESTION DE PROJET AVANCÉE
- ❌ Pas de suivi d'avancement de construction (timeline)
- ❌ Pas de gestion des risques par projet
- ❌ Pas de suivi des jalons (milestones)
- ❌ Pas de gestion des entrepreneurs/sous-traitants
- ❌ Pas de contrôle qualité
- ❌ Pas de gestion des changements (change orders)
- ❌ Pas de dashboard de projet individuel

#### 3. ANALYSE & REPORTING
- ❌ Pas de tableaux de bord personnalisables
- ❌ Pas de rapports comparatifs entre projets
- ❌ Pas d'analyse de variance (budget vs réel)
- ❌ Pas de prévisions financières
- ❌ Pas de rapports exécutifs automatisés
- ❌ Graphiques limités (pas de visualisations avancées)
- ❌ Pas d'export Excel complet

#### 4. WORKFLOW & APPROBATIONS
- ❌ Pas de workflow d'approbation multiniveaux
- ❌ Pas de limites d'approbation par montant
- ❌ Pas de délégation de pouvoir
- ❌ Pas de traçabilité complète des approbations
- ❌ Pas de système de notifications email

#### 5. BUDGÉTISATION
- ❌ Pas de module de budget annuel
- ❌ Pas de suivi budget vs réel
- ❌ Pas de révisions budgétaires
- ❌ Pas d'allocation budgétaire par département/projet
- ❌ Pas de contrôle budgétaire automatique

#### 6. INVESTISSEURS & COMMUNICATION
- ❌ Pas de portail investisseur dédié
- ❌ Pas de rapports automatisés mensuels/trimestriels
- ❌ Pas de notifications importantes
- ❌ Pas de forum/messagerie interne
- ❌ Pas de calendrier d'événements (AGM, votes)

#### 7. CONFORMITÉ & AUDIT
- ❌ Pas de piste d'audit détaillée (qui a changé quoi/quand)
- ❌ Pas de versioning des documents
- ❌ Pas de signatures électroniques
- ❌ Pas de workflow de révision/approbation documents
- ❌ Pas de conformité RGPD/PIPEDA

#### 8. INTÉGRATIONS
- ❌ Pas d'intégration bancaire (API)
- ❌ Pas d'intégration comptable (QuickBooks, Xero)
- ❌ Pas d'API REST publique
- ❌ Pas de webhooks
- ❌ Pas d'intégration calendrier (Google, Outlook)

---

## 🎯 PLAN D'AMÉLIORATION PRIORITAIRE

### PHASE 1: TRÉSORERIE & CONTRÔLE FINANCIER (3-4 semaines)
**Objectif:** Visibilité complète sur la santé financière

#### 1.1 Module Trésorerie Avancé
**Fonctionnalités:**

```typescript
// Nouvelles tables SQL
CREATE TABLE cash_flow_forecast (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  category TEXT, // 'operating', 'investing', 'financing'
  type TEXT, // 'inflow', 'outflow'
  amount DECIMAL(12,2),
  scenario_id UUID REFERENCES scenarios(id),
  description TEXT,
  confidence_level INTEGER, // 1-5 (1=certain, 5=incertain)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  currency TEXT DEFAULT 'CAD',
  current_balance DECIMAL(12,2),
  last_reconciliation DATE,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY,
  bank_account_id UUID REFERENCES bank_accounts(id),
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(12,2),
  transaction_type TEXT, // 'debit', 'credit'
  category TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  matched_transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMP
);

CREATE TABLE payment_obligations (
  id UUID PRIMARY KEY,
  type TEXT, // 'accounts_payable', 'loan_payment', 'tax_payment'
  vendor_name TEXT,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2),
  currency TEXT DEFAULT 'CAD',
  status TEXT, // 'pending', 'paid', 'overdue'
  priority INTEGER, // 1-5
  project_id UUID REFERENCES scenarios(id),
  paid_date DATE,
  paid_transaction_id UUID REFERENCES transactions(id)
);

CREATE TABLE treasury_alerts (
  id UUID PRIMARY KEY,
  alert_type TEXT, // 'low_balance', 'overdue_payment', 'budget_exceeded'
  threshold_amount DECIMAL(12,2),
  current_value DECIMAL(12,2),
  severity TEXT, // 'info', 'warning', 'critical'
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  resolved_at TIMESTAMP
);
```

**Composants React à créer:**
- `TreasuryDashboard.tsx` - Dashboard trésorerie temps réel
- `CashFlowForecast.tsx` - Prévisions 12 mois glissants
- `BankReconciliation.tsx` - Rapprochement bancaire
- `PaymentSchedule.tsx` - Calendrier paiements à venir
- `TreasuryAlerts.tsx` - Alertes liquidité

**Vues SQL:**
```sql
CREATE VIEW treasury_position AS
SELECT
  ba.id,
  ba.name,
  ba.current_balance,
  SUM(CASE WHEN po.status = 'pending' THEN po.amount ELSE 0 END) as pending_obligations,
  ba.current_balance - SUM(CASE WHEN po.status = 'pending' THEN po.amount ELSE 0 END) as available_cash,
  COUNT(CASE WHEN po.status = 'overdue' THEN 1 END) as overdue_count
FROM bank_accounts ba
LEFT JOIN payment_obligations po ON po.due_date >= CURRENT_DATE
GROUP BY ba.id;

CREATE VIEW cash_flow_12_months AS
SELECT
  DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN type = 'inflow' THEN amount ELSE 0 END) as total_inflows,
  SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END) as total_outflows,
  SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END) as net_cash_flow
FROM cash_flow_forecast
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month;
```

**Fonctions clés:**
```sql
-- Calculer position de trésorerie à une date future
CREATE FUNCTION calculate_treasury_position(target_date DATE)
RETURNS TABLE (
  projected_balance DECIMAL,
  risk_level TEXT,
  days_until_critical INTEGER
);

-- Prioriser les paiements selon la trésorerie disponible
CREATE FUNCTION prioritize_payments(available_cash DECIMAL)
RETURNS TABLE (
  payment_id UUID,
  vendor TEXT,
  amount DECIMAL,
  priority_score INTEGER
);
```

#### 1.2 Tableau de Bord Trésorerie

**KPIs à afficher:**
1. **Position de trésorerie actuelle** (toutes banques)
2. **Prévision 30/60/90 jours**
3. **Ratio de liquidité courante**
4. **Jours de trésorerie disponibles** (runway)
5. **Obligations à venir (7/30 jours)**
6. **Alertes critiques**

**Graphiques:**
- Courbe trésorerie 12 mois (historique + prévision)
- Waterfall chart des flux mensuels
- Pie chart répartition des obligations
- Barres empilées: entrées vs sorties

---

### PHASE 2: GESTION DE PROJET AVANCÉE (3-4 semaines)
**Objectif:** Suivi complet du cycle de vie des projets

#### 2.1 Module Timeline & Jalons

```typescript
CREATE TABLE project_phases (
  id UUID PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id),
  phase_name TEXT, // 'Planning', 'Permis', 'Construction', 'Finition', 'Livraison'
  start_date DATE,
  planned_end_date DATE,
  actual_end_date DATE,
  progress_percent INTEGER DEFAULT 0,
  status TEXT, // 'not_started', 'in_progress', 'delayed', 'completed'
  budget_allocated DECIMAL(12,2),
  budget_spent DECIMAL(12,2),
  responsible_person TEXT,
  notes TEXT
);

CREATE TABLE project_milestones (
  id UUID PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id),
  phase_id UUID REFERENCES project_phases(id),
  milestone_name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  actual_date DATE,
  is_critical BOOLEAN DEFAULT false,
  status TEXT, // 'pending', 'achieved', 'delayed', 'at_risk'
  completion_criteria TEXT,
  verification_documents JSONB
);

CREATE TABLE project_risks (
  id UUID PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id),
  risk_category TEXT, // 'financial', 'regulatory', 'construction', 'market'
  risk_description TEXT NOT NULL,
  probability INTEGER, // 1-5
  impact INTEGER, // 1-5
  risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  mitigation_plan TEXT,
  owner TEXT,
  status TEXT, // 'open', 'monitoring', 'mitigated', 'realized'
  identified_date DATE DEFAULT CURRENT_DATE,
  last_review_date DATE
);

CREATE TABLE contractors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  specialty TEXT, // 'general', 'electrical', 'plumbing', 'hvac'
  contact_email TEXT,
  contact_phone TEXT,
  license_number TEXT,
  insurance_expiry DATE,
  performance_rating DECIMAL(3,2), // 0-5.00
  total_projects INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE project_assignments (
  id UUID PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id),
  contractor_id UUID REFERENCES contractors(id),
  phase_id UUID REFERENCES project_phases(id),
  contract_amount DECIMAL(12,2),
  contract_date DATE,
  start_date DATE,
  end_date DATE,
  payment_schedule JSONB,
  performance_notes TEXT
);
```

**Composants:**
- `ProjectTimeline.tsx` - Timeline Gantt-like
- `MilestoneTracker.tsx` - Suivi jalons critiques
- `RiskRegister.tsx` - Registre des risques
- `ContractorManagement.tsx` - Gestion entrepreneurs
- `ProgressReporting.tsx` - Rapports d'avancement

#### 2.2 Dashboard Projet Individuel

**Onglets par projet:**
1. **Vue d'ensemble** - KPIs, statut, alertes
2. **Timeline** - Phases et jalons
3. **Budget** - Vs réel avec variance
4. **Risques** - Registre et heat map
5. **Équipe** - Entrepreneurs et affectations
6. **Documents** - Tous les documents
7. **Financier** - Transactions et bookings
8. **Performance** - ROI vs prévisions

---

### PHASE 3: BUDGÉTISATION & CONTRÔLE (2-3 semaines)

#### 3.1 Module Budget

```typescript
CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  name TEXT,
  type TEXT, // 'operational', 'capital', 'project'
  scenario_id UUID REFERENCES scenarios(id),
  status TEXT, // 'draft', 'submitted', 'approved', 'active', 'closed'
  total_amount DECIMAL(12,2),
  approved_by UUID,
  approved_date DATE,
  version INTEGER DEFAULT 1,
  notes TEXT
);

CREATE TABLE budget_lines (
  id UUID PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id),
  category TEXT, // 'revenue', 'cogs', 'opex', 'capex'
  subcategory TEXT,
  account_code TEXT,
  planned_amount DECIMAL(12,2),
  q1_amount DECIMAL(12,2),
  q2_amount DECIMAL(12,2),
  q3_amount DECIMAL(12,2),
  q4_amount DECIMAL(12,2),
  notes TEXT
);

CREATE TABLE budget_revisions (
  id UUID PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id),
  revision_date DATE DEFAULT CURRENT_DATE,
  revised_by UUID,
  reason TEXT,
  previous_total DECIMAL(12,2),
  new_total DECIMAL(12,2),
  changes JSONB,
  approved BOOLEAN DEFAULT false
);

-- Vue: Budget vs Réel
CREATE VIEW budget_variance AS
SELECT
  bl.budget_id,
  bl.category,
  bl.subcategory,
  bl.planned_amount,
  COALESCE(SUM(t.amount), 0) as actual_amount,
  bl.planned_amount - COALESCE(SUM(t.amount), 0) as variance,
  CASE
    WHEN bl.planned_amount > 0 THEN
      ((bl.planned_amount - COALESCE(SUM(t.amount), 0)) / bl.planned_amount * 100)
    ELSE 0
  END as variance_percent
FROM budget_lines bl
LEFT JOIN transactions t ON t.type = bl.category
  AND EXTRACT(YEAR FROM t.date) = (SELECT fiscal_year FROM budgets WHERE id = bl.budget_id)
GROUP BY bl.id, bl.budget_id, bl.category, bl.subcategory, bl.planned_amount;
```

**Composants:**
- `BudgetBuilder.tsx` - Création budget annuel
- `BudgetVarianceReport.tsx` - Rapport variance
- `BudgetApprovalWorkflow.tsx` - Workflow approbation
- `QuarterlyBudgetReview.tsx` - Révisions trimestrielles

#### 3.2 Contrôle Budgétaire Automatique

**Règles de validation:**
```typescript
// Fonction PostgreSQL
CREATE FUNCTION check_budget_compliance(
  p_transaction_amount DECIMAL,
  p_category TEXT,
  p_project_id UUID
) RETURNS TABLE (
  is_compliant BOOLEAN,
  available_budget DECIMAL,
  warning_message TEXT
);

// Trigger sur transactions
CREATE TRIGGER enforce_budget_control
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION validate_budget_before_transaction();
```

---

### PHASE 4: REPORTING & ANALYTICS (2-3 semaines)

#### 4.1 Tableaux de Bord Personnalisables

**Architecture:**
```typescript
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY,
  user_id UUID,
  layout_name TEXT,
  is_default BOOLEAN DEFAULT false,
  widgets JSONB, // Array de widgets avec positions
  created_at TIMESTAMP
);

CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY,
  widget_type TEXT, // 'kpi', 'chart', 'table', 'calendar'
  data_source TEXT, // Vue ou fonction SQL
  config JSONB, // Paramètres widget
  refresh_interval INTEGER // Secondes
);
```

**Types de widgets:**
1. **KPI Cards** - Chiffres clés
2. **Line Charts** - Tendances temporelles
3. **Bar Charts** - Comparaisons
4. **Pie/Donut Charts** - Répartitions
5. **Tables** - Données détaillées
6. **Heatmaps** - Visualisations matricielles
7. **Gauges** - Indicateurs de performance
8. **Calendriers** - Événements/échéances

**Composants:**
- `DashboardBuilder.tsx` - Constructeur drag & drop
- `WidgetLibrary.tsx` - Bibliothèque de widgets
- `ChartConfigurator.tsx` - Configuration graphiques

#### 4.2 Rapports Exécutifs Automatisés

**Rapports à créer:**

1. **Rapport Mensuel de Performance**
   - Vue d'ensemble financière
   - Variance budget vs réel
   - Avancement projets
   - Top 5 risques
   - Recommandations

2. **Rapport Trimestriel Investisseurs**
   - Performance ROI
   - Distribution des parts
   - Revenus locatifs
   - Dividendes versés
   - Outlook futur

3. **Rapport Annuel**
   - Bilan complet
   - Analyse comparative année/année
   - Projets complétés
   - Nouveaux investissements
   - Stratégie année suivante

**Automatisation:**
```typescript
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY,
  report_type TEXT,
  frequency TEXT, // 'monthly', 'quarterly', 'annual'
  recipients JSONB, // Array d'emails
  last_generated TIMESTAMP,
  next_generation TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

// Fonction pour générer et envoyer
CREATE FUNCTION generate_and_send_report(p_report_id UUID)
RETURNS BOOLEAN;
```

#### 4.3 Export Excel Avancé

**Bibliothèque:** `exceljs` ou `xlsx`

**Templates Excel:**
1. Registre des transactions (toutes colonnes)
2. Budget vs Réel (format tableau croisé)
3. Performance projets (multi-onglets)
4. Analyse investisseurs (avec graphiques)
5. Cash flow statement (format comptable)

---

### PHASE 5: WORKFLOW & APPROBATIONS (2 semaines)

#### 5.1 Système d'Approbation Multiniveaux

```typescript
CREATE TABLE approval_workflows (
  id UUID PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  entity_type TEXT, // 'transaction', 'budget', 'project', 'contract'
  rules JSONB, // Conditions et niveaux requis
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE approval_rules (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES approval_workflows(id),
  condition_field TEXT, // 'amount', 'type', 'category'
  condition_operator TEXT, // '>', '<', '=', 'in'
  condition_value TEXT,
  required_approvers INTEGER,
  approver_roles JSONB, // ['admin', 'finance_manager']
  sequence_order INTEGER
);

CREATE TABLE approval_requests (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES approval_workflows(id),
  entity_type TEXT,
  entity_id UUID,
  requested_by UUID,
  requested_at TIMESTAMP DEFAULT NOW(),
  current_level INTEGER DEFAULT 1,
  status TEXT, // 'pending', 'approved', 'rejected', 'cancelled'
  urgency TEXT, // 'low', 'medium', 'high', 'critical'
  notes TEXT
);

CREATE TABLE approval_actions (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES approval_requests(id),
  approver_id UUID,
  action TEXT, // 'approved', 'rejected', 'delegated'
  action_date TIMESTAMP DEFAULT NOW(),
  comments TEXT,
  level INTEGER
);
```

**Règles métier:**
```typescript
// Exemple: Approbation transactions
Si montant < 5,000 CAD → 1 approbateur (Manager)
Si montant >= 5,000 et < 25,000 CAD → 2 approbateurs (Manager + CFO)
Si montant >= 25,000 CAD → 3 approbateurs (Manager + CFO + CEO)

// Approbation budgets
Budget opérationnel < 100k → CFO
Budget opérationnel >= 100k → CFO + CEO
Budget capital > 50k → CFO + CEO + Conseil
```

**Composants:**
- `ApprovalCenter.tsx` - Centre d'approbation
- `MyApprovals.tsx` - Mes approbations en attente
- `ApprovalHistory.tsx` - Historique
- `WorkflowBuilder.tsx` - Création workflows

#### 5.2 Notifications Email

**Système de notifications:**
```typescript
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  template_name TEXT,
  event_type TEXT, // 'approval_required', 'payment_due', 'milestone_reached'
  subject_template TEXT,
  body_template TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE notification_log (
  id UUID PRIMARY KEY,
  recipient_email TEXT,
  template_id UUID REFERENCES notification_templates(id),
  sent_at TIMESTAMP,
  status TEXT, // 'sent', 'failed', 'bounced'
  error_message TEXT
);
```

**Événements déclencheurs:**
1. Transaction créée → Approbation requise
2. Approbation accordée → Notify requester
3. Paiement dû dans 7 jours → Alert finance
4. Budget dépassé → Alert manager + CFO
5. Milestone atteint → Alert projet team
6. Rapport généré → Envoyer aux investisseurs
7. Trésorerie critique → Alert CEO + CFO

**Intégration:** Resend, SendGrid, ou AWS SES

---

### PHASE 6: PORTAIL INVESTISSEUR (2 semaines)

#### 6.1 Interface Dédiée Investisseurs

**Routes:**
- `/investor-portal/dashboard` - Dashboard personnel
- `/investor-portal/portfolio` - Mon portfolio
- `/investor-portal/statements` - Relevés
- `/investor-portal/documents` - Mes documents
- `/investor-portal/votes` - Votes en cours
- `/investor-portal/messages` - Messagerie
- `/investor-portal/settings` - Paramètres

**Fonctionnalités:**
1. **Dashboard personnalisé**
   - Valeur totale de mes parts
   - ROI personnel
   - Dividendes reçus
   - Prochains événements

2. **Portfolio détaillé**
   - Liste des projets avec mes %
   - Performance par projet
   - Graphique allocation

3. **Relevés automatiques**
   - Mensuel: Résumé activité
   - Trimestriel: Performance + dividendes
   - Annuel: T5, relevé fiscal

4. **Centre de vote**
   - Votes en cours avec countdown
   - Historique de mes votes
   - Détails projets à voter

5. **Messagerie sécurisée**
   - Messages de l'administration
   - Support tickets
   - Annonces importantes

**Tables:**
```typescript
CREATE TABLE investor_messages (
  id UUID PRIMARY KEY,
  from_user_id UUID,
  to_investor_id UUID REFERENCES investors(id),
  subject TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE investor_preferences (
  investor_id UUID PRIMARY KEY REFERENCES investors(id),
  email_notifications BOOLEAN DEFAULT true,
  notification_frequency TEXT, // 'real_time', 'daily', 'weekly'
  preferred_language TEXT DEFAULT 'fr',
  dashboard_widgets JSONB
);
```

---

### PHASE 7: CONFORMITÉ & AUDIT (2 semaines)

#### 7.1 Piste d'Audit Complète

```typescript
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT, // 'INSERT', 'UPDATE', 'DELETE'
  user_id UUID,
  user_email TEXT,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Trigger automatique sur toutes les tables critiques
CREATE FUNCTION audit_trigger_func() RETURNS TRIGGER;

-- Appliquer à toutes les tables
CREATE TRIGGER audit_investors AFTER INSERT OR UPDATE OR DELETE ON investors
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- etc. pour toutes les tables
```

**Composant:**
- `AuditTrail.tsx` - Visualisation piste d'audit
  - Filtres: Table, utilisateur, date, action
  - Diff viewer (avant/après)
  - Export CSV pour audits

#### 7.2 Versioning Documents

```typescript
CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  changes_description TEXT,
  file_size BIGINT,
  checksum TEXT
);

CREATE TABLE document_approvals (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  version_id UUID REFERENCES document_versions(id),
  approver_id UUID,
  status TEXT, // 'pending', 'approved', 'rejected'
  approved_at TIMESTAMP,
  comments TEXT
);
```

**Fonctionnalités:**
- Upload nouvelle version (auto-increment version)
- Comparaison versions
- Rollback à version antérieure
- Workflow approbation par version

#### 7.3 Signatures Électroniques

**Intégration:** DocuSign API ou HelloSign

**Use cases:**
- Contrats investisseurs
- Contrats entrepreneurs
- Approbations budgets importants
- Documents légaux

```typescript
CREATE TABLE signature_requests (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  signers JSONB, // Array {email, name, role}
  status TEXT, // 'sent', 'partially_signed', 'completed', 'declined'
  external_request_id TEXT, // DocuSign envelope ID
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  signed_document_path TEXT
);
```

---

### PHASE 8: INTÉGRATIONS (3 semaines)

#### 8.1 Intégration Bancaire (Open Banking)

**APIs:** Plaid, Flinks, ou banques directes

**Fonctionnalités:**
1. **Connexion comptes bancaires**
   - OAuth sécurisé
   - Multi-banques
   - Refresh token auto

2. **Import transactions automatique**
   - Synchronisation quotidienne
   - Catégorisation automatique (ML)
   - Matching avec transactions existantes

3. **Vérification soldes temps réel**
   - Alertes écarts
   - Dashboard trésorerie live

**Architecture:**
```typescript
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY,
  bank_account_id UUID REFERENCES bank_accounts(id),
  provider TEXT, // 'plaid', 'flinks'
  access_token_encrypted TEXT,
  item_id TEXT,
  last_sync TIMESTAMP,
  sync_status TEXT,
  error_message TEXT
);

// Service de synchronisation
async function syncBankTransactions(connectionId: UUID) {
  // 1. Récupérer transactions depuis API
  // 2. Détecter nouvelles transactions
  // 3. Catégoriser automatiquement (ML)
  // 4. Proposer matching
  // 5. Enregistrer dans bank_transactions
}
```

#### 8.2 Intégration Comptable

**APIs:** QuickBooks Online, Xero, FreshBooks

**Synchronisation bidirectionnelle:**
- Clients ← Investisseurs
- Fournisseurs ← Contractors
- Factures → Transactions
- Paiements → Transactions
- Comptes → Chart of accounts mapping

**Tables de mapping:**
```typescript
CREATE TABLE accounting_mapping (
  id UUID PRIMARY KEY,
  local_entity_type TEXT, // 'investor', 'contractor', 'account'
  local_entity_id UUID,
  external_system TEXT, // 'quickbooks', 'xero'
  external_entity_id TEXT,
  external_entity_type TEXT,
  last_synced TIMESTAMP,
  sync_direction TEXT // 'push', 'pull', 'bidirectional'
);
```

#### 8.3 API REST Publique

**Endpoints à créer:**

```typescript
// Authentication
POST /api/v1/auth/login
POST /api/v1/auth/refresh

// Investisseurs
GET /api/v1/investors
GET /api/v1/investors/:id
POST /api/v1/investors
PUT /api/v1/investors/:id
GET /api/v1/investors/:id/portfolio

// Projets
GET /api/v1/projects
GET /api/v1/projects/:id
POST /api/v1/projects
GET /api/v1/projects/:id/performance

// Transactions
GET /api/v1/transactions
POST /api/v1/transactions
GET /api/v1/transactions/:id

// Rapports
GET /api/v1/reports/treasury
GET /api/v1/reports/performance
GET /api/v1/reports/budget-variance

// Webhooks
POST /api/v1/webhooks/register
DELETE /api/v1/webhooks/:id
GET /api/v1/webhooks
```

**Documentation:** Swagger/OpenAPI

**Sécurité:**
- API Keys
- Rate limiting (100 req/min)
- JWT tokens
- CORS configuration
- Webhooks signatures

---

## 🔧 AMÉLIORATIONS TECHNIQUES

### 1. Performance & Scalabilité

**Optimisations base de données:**
```sql
-- Partitionnement transactions par année
CREATE TABLE transactions_2024 PARTITION OF transactions
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE transactions_2025 PARTITION OF transactions
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Indexes composites
CREATE INDEX idx_transactions_date_type ON transactions(date DESC, type);
CREATE INDEX idx_scenarios_status_date ON scenarios(status, created_at DESC);

-- Materialized views pour rapports lourds
CREATE MATERIALIZED VIEW mv_monthly_summary AS
SELECT
  DATE_TRUNC('month', date) as month,
  type,
  currency,
  SUM(amount) as total
FROM transactions
GROUP BY DATE_TRUNC('month', date), type, currency;

-- Refresh automatique quotidien
CREATE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_investor_performance;
END;
$$ LANGUAGE plpgsql;
```

**Caching:**
- Redis pour sessions et données fréquentes
- Cache API responses (SWR ou React Query)
- Edge caching Vercel pour pages publiques

**Background Jobs:**
```typescript
// Vercel Cron Jobs ou service externe (Trigger.dev)
export async function dailyJobs() {
  // 1. Sync taux de change
  await syncExchangeRates();

  // 2. Calculer performance projets
  await calculateAllProjectsPerformance();

  // 3. Générer alertes trésorerie
  await generateTreasuryAlerts();

  // 4. Sync transactions bancaires
  await syncAllBankAccounts();

  // 5. Envoyer notifications en attente
  await sendPendingNotifications();

  // 6. Refresh materialized views
  await refreshMaterializedViews();
}
```

### 2. Tests Automatisés

**Framework:** Jest + React Testing Library

**Coverage cible:** 70%+

**Tests à créer:**
```typescript
// Tests unitaires
describe('calculateROI', () => {
  it('should calculate ROI correctly for positive return', () => {
    // ...
  });
});

// Tests d'intégration
describe('Treasury Module', () => {
  it('should create cash flow forecast and update position', async () => {
    // ...
  });
});

// Tests E2E
describe('Approval Workflow', () => {
  it('should route transaction through correct approval levels', () => {
    // Cypress or Playwright
  });
});
```

### 3. Monitoring & Alerting

**Outils:**
- **Sentry** - Error tracking
- **Vercel Analytics** - Performance
- **Datadog/New Relic** - APM
- **Better Uptime** - Uptime monitoring

**Métriques clés:**
- Response time API < 200ms
- Error rate < 0.1%
- Uptime > 99.9%
- Database query time < 50ms

**Alertes:**
- Error rate > 1% → Slack/Email
- Database slow queries → Alert devs
- Uptime incident → PagerDuty

---

## 📅 ROADMAP D'IMPLÉMENTATION

### TRIMESTRE 1 (Semaines 1-12)

**Semaines 1-4: Trésorerie**
- ✅ Tables cash flow, bank accounts, payment obligations
- ✅ Composant TreasuryDashboard
- ✅ Prévisions 12 mois
- ✅ Alertes liquidité

**Semaines 5-8: Gestion Projet**
- ✅ Tables phases, milestones, risks, contractors
- ✅ ProjectTimeline component
- ✅ Dashboard projet individuel
- ✅ Registre des risques

**Semaines 9-12: Budgétisation**
- ✅ Module budget complet
- ✅ Budget vs Réel reporting
- ✅ Contrôle budgétaire automatique
- ✅ Révisions budgétaires

### TRIMESTRE 2 (Semaines 13-24)

**Semaines 13-16: Reporting**
- ✅ Dashboard builder personnalisable
- ✅ Bibliothèque de widgets
- ✅ Rapports exécutifs automatisés
- ✅ Export Excel avancé

**Semaines 17-20: Workflow**
- ✅ Système d'approbation multiniveaux
- ✅ Notifications email (Resend)
- ✅ Centre d'approbation
- ✅ Délégation de pouvoir

**Semaines 21-24: Portail Investisseur**
- ✅ Interface dédiée investisseurs
- ✅ Dashboard personnalisé
- ✅ Messagerie sécurisée
- ✅ Centre de vote amélioré

### TRIMESTRE 3 (Semaines 25-36)

**Semaines 25-28: Conformité**
- ✅ Audit trail complet
- ✅ Versioning documents
- ✅ Signatures électroniques (DocuSign)
- ✅ RGPD/PIPEDA compliance

**Semaines 29-36: Intégrations**
- ✅ Intégration bancaire (Plaid)
- ✅ Intégration comptable (QuickBooks)
- ✅ API REST publique + documentation
- ✅ Webhooks système

### TRIMESTRE 4 (Semaines 37-48)

**Semaines 37-42: Optimisation**
- ✅ Tests automatisés (70% coverage)
- ✅ Performance tuning
- ✅ Caching Redis
- ✅ Background jobs

**Semaines 43-48: Polissage**
- ✅ Monitoring (Sentry + Analytics)
- ✅ Documentation utilisateur
- ✅ Formation équipe
- ✅ Migration données

---

## 💰 ESTIMATION BUDGET

### Développement (12 mois)
- **Développeur Senior Full-Stack** (1 FTE) : 120k - 150k CAD/an
- **Développeur Backend** (0.5 FTE) : 60k - 75k CAD/an
- **Designer UX/UI** (0.25 FTE) : 20k - 25k CAD/an
- **QA Tester** (0.25 FTE) : 15k - 20k CAD/an
- **TOTAL Développement:** 215k - 270k CAD

### Licences & Services (annuel)
- **Supabase Pro** : 25 USD/mois = 300 USD/an (~400 CAD)
- **Vercel Pro** : 20 USD/mois = 240 USD/an (~320 CAD)
- **Plaid** : 0.50 USD/transaction (500 tx/mois) = 3,000 USD/an (~4,000 CAD)
- **QuickBooks API** : Gratuit
- **DocuSign** : 40 USD/mois = 480 USD/an (~640 CAD)
- **Resend/SendGrid** : 20 USD/mois = 240 USD/an (~320 CAD)
- **Sentry** : 26 USD/mois = 312 USD/an (~420 CAD)
- **Redis Cloud** : 30 USD/mois = 360 USD/an (~480 CAD)
- **TOTAL Services:** ~6,580 CAD/an

### TOTAL 12 MOIS
**~221k - 277k CAD** (développement + services)

### Alternative: Développement Agile par Sprints
- **Sprint 2 semaines** : 10k - 15k CAD
- **24 sprints** (12 mois) : 240k - 360k CAD

---

## 🎯 RETOUR SUR INVESTISSEMENT

### Gains Mesurables

1. **Réduction temps administratif**
   - Avant: 20h/semaine de saisie manuelle
   - Après: 5h/semaine (automatisation)
   - **Gain:** 15h/semaine × 52 semaines = 780h/an
   - **Valeur:** 780h × 50 CAD/h = **39,000 CAD/an**

2. **Réduction erreurs comptables**
   - Avant: ~5% erreurs (corrections manuelles)
   - Après: <0.5% erreurs (validations automatiques)
   - **Gain:** Réduction coûts corrections + confiance investisseurs

3. **Meilleure trésorerie**
   - Optimisation timing paiements
   - Réduction découverts bancaires
   - **Gain estimé:** 10-20k CAD/an (intérêts évités)

4. **Croissance investisseurs**
   - Portail professionnel → Confiance accrue
   - **Gain:** +10-15 nouveaux investisseurs/an
   - **Capital additionnel:** ~500k - 1M CAD/an

5. **Évitement pénalités fiscales**
   - Rapports automatisés et conformes
   - **Gain:** Évitement 5-10k CAD/an pénalités

**ROI ESTIMÉ:** 12-18 mois

---

## ✅ LIVRABLES PAR PHASE

### Phase 1: Trésorerie
- [ ] 5 nouvelles tables SQL
- [ ] 8 vues calculées
- [ ] 5 fonctions PostgreSQL
- [ ] 6 composants React
- [ ] Tests unitaires (70% coverage)
- [ ] Documentation utilisateur

### Phase 2: Gestion Projet
- [ ] 6 nouvelles tables
- [ ] 4 vues calculées
- [ ] 7 composants React
- [ ] Dashboard projet complet
- [ ] Tests E2E timeline

### Phase 3: Budgétisation
- [ ] 3 nouvelles tables
- [ ] 2 vues calculées
- [ ] 4 composants React
- [ ] Workflow approbation
- [ ] Guide budgétisation

### Phase 4: Reporting
- [ ] Dashboard builder drag & drop
- [ ] 10+ types de widgets
- [ ] 3 templates rapports exécutifs
- [ ] Export Excel multi-onglets
- [ ] Scheduler rapports automatiques

### Phase 5: Workflow
- [ ] 4 nouvelles tables
- [ ] Centre d'approbation
- [ ] Email notifications (10+ templates)
- [ ] 3 composants React
- [ ] Workflow configurator

### Phase 6: Portail Investisseur
- [ ] 6 nouvelles pages
- [ ] Dashboard personnalisé
- [ ] Messagerie sécurisée
- [ ] Mobile responsive
- [ ] Guide investisseur

### Phase 7: Conformité
- [ ] Audit trail complet
- [ ] Document versioning
- [ ] Intégration DocuSign
- [ ] RGPD compliance check
- [ ] Rapport conformité

### Phase 8: Intégrations
- [ ] API Plaid intégrée
- [ ] API QuickBooks intégrée
- [ ] API REST publique (20+ endpoints)
- [ ] Documentation Swagger
- [ ] Webhooks système

---

## 📊 MÉTRIQUES DE SUCCÈS

### KPIs Techniques
- ✅ Uptime > 99.9%
- ✅ Response time < 200ms
- ✅ Error rate < 0.1%
- ✅ Test coverage > 70%
- ✅ Lighthouse score > 90

### KPIs Métier
- ✅ Temps saisie transactions: -75%
- ✅ Erreurs comptables: -90%
- ✅ Satisfaction investisseurs: > 4.5/5
- ✅ Délai approbation: -50%
- ✅ Rapports générés: +300%

### KPIs Financiers
- ✅ Coûts administratifs: -30%
- ✅ Nouveaux investisseurs: +25%
- ✅ Capital levé: +50%
- ✅ ROI plateforme: 12-18 mois

---

## 🚨 RISQUES & MITIGATION

### Risques Identifiés

1. **Complexité technique élevée**
   - **Impact:** Délais, bugs
   - **Mitigation:** Architecture modulaire, tests automatisés, code reviews

2. **Résistance au changement utilisateurs**
   - **Impact:** Faible adoption
   - **Mitigation:** Formation, documentation, support dédié, roll-out progressif

3. **Coûts dépassement**
   - **Impact:** Budget insuffisant
   - **Mitigation:** Sprints Agile, priorisation MVP, phases flexibles

4. **Sécurité données financières**
   - **Impact:** Breach, perte confiance
   - **Mitigation:** Audits sécurité, encryption, penetration testing

5. **Dépendance APIs tierces**
   - **Impact:** Pannes externes
   - **Mitigation:** Fallbacks, caching, monitoring, SLAs

---

## 📚 RECOMMANDATIONS FINALES

### Priorité 1 (MUST HAVE - 6 mois)
1. **Trésorerie avancée** - Visibilité critique
2. **Budgétisation** - Contrôle essentiel
3. **Workflow approbations** - Gouvernance
4. **Reporting automatisé** - Transparence

### Priorité 2 (SHOULD HAVE - 12 mois)
5. **Gestion projet avancée** - Suivi construction
6. **Portail investisseur** - Expérience client
7. **Intégration bancaire** - Automatisation

### Priorité 3 (NICE TO HAVE - 18 mois)
8. **Conformité & audit** - Scalabilité
9. **API REST publique** - Écosystème
10. **Mobile app** - Accessibilité

### Architecture Recommandée
```
Frontend (Next.js 14)
├── App Router (SSR + SSG)
├── TypeScript strict
├── Tailwind CSS + shadcn/ui
├── React Query (caching)
└── Recharts (visualisations)

Backend (Supabase)
├── PostgreSQL 15+
├── Row Level Security
├── Realtime subscriptions
├── Edge Functions (serverless)
└── Storage buckets

Services Externes
├── Plaid (banking)
├── QuickBooks (accounting)
├── DocuSign (signatures)
├── Resend (emails)
└── Redis (caching)

Infrastructure
├── Vercel (hosting + edge)
├── GitHub Actions (CI/CD)
├── Sentry (monitoring)
└── Datadog (APM)
```

### Stack Technologique Supplémentaire
```json
{
  "frontend": {
    "ui": "shadcn/ui",
    "charts": "recharts",
    "forms": "react-hook-form + zod",
    "state": "zustand ou jotai",
    "data-fetching": "@tanstack/react-query"
  },
  "backend": {
    "orm": "prisma (optionnel)",
    "jobs": "trigger.dev",
    "caching": "upstash redis"
  },
  "testing": {
    "unit": "vitest",
    "integration": "playwright",
    "e2e": "cypress"
  }
}
```

---

## 🎓 FORMATION & DOCUMENTATION

### Guides à Créer
1. **Guide Administrateur** (50 pages)
   - Configuration système
   - Gestion utilisateurs
   - Workflows approbation
   - Maintenance

2. **Guide Investisseur** (20 pages)
   - Utilisation portail
   - Lecture rapports
   - Processus vote
   - FAQ

3. **Guide Comptable** (30 pages)
   - Saisie transactions
   - Rapprochement bancaire
   - Rapports fiscaux
   - Intégrations

4. **Documentation Développeur** (100 pages)
   - Architecture
   - API Reference
   - Database Schema
   - Deployment

### Vidéos Formation
- Onboarding (15 min)
- Dashboard walkthrough (10 min)
- Gestion projets (20 min)
- Trésorerie & budgets (25 min)
- Rapports & exports (15 min)

---

## 🏁 CONCLUSION

Ce plan transformera CERDIA en une **plateforme de gestion d'investissement de classe mondiale**, avec:

✅ **Contrôle financier total** - Trésorerie, budgets, prévisions
✅ **Gestion projet avancée** - Timeline, risques, jalons
✅ **Reporting puissant** - Dashboards personnalisables, automatisation
✅ **Workflow professionnel** - Approbations multiniveaux
✅ **Expérience investisseur** - Portail dédié, transparence
✅ **Conformité & sécurité** - Audit trail, signatures électroniques
✅ **Intégrations** - Bancaire, comptable, API publique

**Investissement:** 221k - 277k CAD (12 mois)
**ROI estimé:** 12-18 mois
**Impact:** Plateforme scalable pour 100+ investisseurs et 50+ projets

---

**Préparé par:** Claude Code
**Date:** 2025-10-21
**Version:** 1.0
**Statut:** Recommandations Finales
