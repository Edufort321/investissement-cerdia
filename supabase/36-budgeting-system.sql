-- =====================================================
-- PHASE 3: SYSTÈME DE BUDGÉTISATION ENTERPRISE
-- =====================================================
-- Features:
-- - Budgets multi-année avec versioning
-- - Catégories budgétaires hiérarchiques
-- - Analyse variance Budget vs Réalisé
-- - Workflow d'approbation
-- - Alertes de dépassement
-- - Révisions et historique complet
-- =====================================================

-- =====================================================
-- 1. CATEGORIES BUDGETAIRES
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('revenue', 'expense', 'capex', 'financing')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la hiérarchie
CREATE INDEX idx_budget_categories_parent ON budget_categories(parent_id);
CREATE INDEX idx_budget_categories_type ON budget_categories(category_type);

-- Catégories par défaut
INSERT INTO budget_categories (category_code, category_name, category_type, sort_order) VALUES
  ('REV', 'Revenus', 'revenue', 1),
  ('REV-RENT', 'Revenus Locatifs', 'revenue', 2),
  ('REV-SALE', 'Ventes Immobilières', 'revenue', 3),
  ('REV-OTHER', 'Autres Revenus', 'revenue', 4),
  ('EXP', 'Dépenses', 'expense', 10),
  ('EXP-OPS', 'Opérations', 'expense', 11),
  ('EXP-MAINT', 'Maintenance', 'expense', 12),
  ('EXP-ADMIN', 'Administration', 'expense', 13),
  ('EXP-TAX', 'Taxes & Impôts', 'expense', 14),
  ('EXP-INT', 'Intérêts', 'expense', 15),
  ('CAPEX', 'Investissements', 'capex', 20),
  ('CAPEX-ACQ', 'Acquisitions', 'capex', 21),
  ('CAPEX-RENOV', 'Rénovations', 'capex', 22),
  ('CAPEX-EQUIP', 'Équipements', 'capex', 23),
  ('FIN', 'Financement', 'financing', 30),
  ('FIN-LOAN', 'Emprunts', 'financing', 31),
  ('FIN-EQUITY', 'Capitaux Propres', 'financing', 32)
ON CONFLICT (category_code) DO NOTHING;

-- =====================================================
-- 2. BUDGETS PRINCIPAUX
-- =====================================================

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  budget_name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'closed', 'rejected')),
  version INTEGER NOT NULL DEFAULT 1,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_expense DECIMAL(12,2) DEFAULT 0,
  total_capex DECIMAL(12,2) DEFAULT 0,
  total_financing DECIMAL(12,2) DEFAULT 0,
  net_budget DECIMAL(12,2) GENERATED ALWAYS AS (total_revenue - total_expense - total_capex + total_financing) STORED,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scenario_id, fiscal_year, version)
);

CREATE INDEX idx_budgets_scenario ON budgets(scenario_id);
CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX idx_budgets_status ON budgets(status);

-- =====================================================
-- 3. LIGNES BUDGETAIRES
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id),
  line_name TEXT NOT NULL,
  description TEXT,
  budgeted_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  allocated_amount DECIMAL(12,2) DEFAULT 0,
  spent_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (budgeted_amount - spent_amount) STORED,
  variance_amount DECIMAL(12,2) GENERATED ALWAYS AS (spent_amount - budgeted_amount) STORED,
  variance_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN budgeted_amount = 0 THEN 0
      ELSE ROUND(((spent_amount - budgeted_amount) / budgeted_amount * 100)::numeric, 2)
    END
  ) STORED,

  -- Périodes mensuelles (pour budgets mensuels)
  month_1 DECIMAL(12,2) DEFAULT 0,
  month_2 DECIMAL(12,2) DEFAULT 0,
  month_3 DECIMAL(12,2) DEFAULT 0,
  month_4 DECIMAL(12,2) DEFAULT 0,
  month_5 DECIMAL(12,2) DEFAULT 0,
  month_6 DECIMAL(12,2) DEFAULT 0,
  month_7 DECIMAL(12,2) DEFAULT 0,
  month_8 DECIMAL(12,2) DEFAULT 0,
  month_9 DECIMAL(12,2) DEFAULT 0,
  month_10 DECIMAL(12,2) DEFAULT 0,
  month_11 DECIMAL(12,2) DEFAULT 0,
  month_12 DECIMAL(12,2) DEFAULT 0,

  -- Alertes et seuils
  alert_threshold DECIMAL(5,2) DEFAULT 90, -- Alerte à 90% du budget
  is_over_budget BOOLEAN GENERATED ALWAYS AS (spent_amount > budgeted_amount) STORED,
  is_near_threshold BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN budgeted_amount = 0 THEN false
      ELSE (spent_amount / budgeted_amount * 100) >= alert_threshold
    END
  ) STORED,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_category ON budget_lines(category_id);
CREATE INDEX idx_budget_lines_over_budget ON budget_lines(is_over_budget) WHERE is_over_budget = true;
CREATE INDEX idx_budget_lines_near_threshold ON budget_lines(is_near_threshold) WHERE is_near_threshold = true;

-- =====================================================
-- 4. REVISIONS BUDGETAIRES
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  budget_line_id UUID REFERENCES budget_lines(id) ON DELETE CASCADE,
  revision_type TEXT NOT NULL CHECK (revision_type IN ('amount_change', 'reallocation', 'new_line', 'category_change', 'full_revision')),
  previous_amount DECIMAL(12,2),
  new_amount DECIMAL(12,2),
  variance DECIMAL(12,2) GENERATED ALWAYS AS (new_amount - previous_amount) STORED,
  reason TEXT NOT NULL,
  justification TEXT,
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_revisions_budget ON budget_revisions(budget_id);
CREATE INDEX idx_budget_revisions_line ON budget_revisions(budget_line_id);
CREATE INDEX idx_budget_revisions_status ON budget_revisions(status);

-- =====================================================
-- 5. APPROBATIONS BUDGETAIRES
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approver_role TEXT NOT NULL,
  approval_level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_approvals_budget ON budget_approvals(budget_id);
CREATE INDEX idx_budget_approvals_approver ON budget_approvals(approver_id);
CREATE INDEX idx_budget_approvals_status ON budget_approvals(status);

-- =====================================================
-- 6. ALERTES BUDGETAIRES
-- =====================================================

CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  budget_line_id UUID REFERENCES budget_lines(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('over_budget', 'near_threshold', 'variance_high', 'approval_pending', 'revision_needed')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  threshold_value DECIMAL(12,2),
  current_value DECIMAL(12,2),
  variance_percent DECIMAL(5,2),
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_alerts_budget ON budget_alerts(budget_id);
CREATE INDEX idx_budget_alerts_line ON budget_alerts(budget_line_id);
CREATE INDEX idx_budget_alerts_type ON budget_alerts(alert_type);
CREATE INDEX idx_budget_alerts_severity ON budget_alerts(severity);
CREATE INDEX idx_budget_alerts_unacknowledged ON budget_alerts(is_acknowledged) WHERE is_acknowledged = false;

-- =====================================================
-- VUES ANALYTIQUES
-- =====================================================

-- Vue 1: Analyse de variance complète
CREATE OR REPLACE VIEW budget_variance_analysis AS
SELECT
  bl.id AS budget_line_id,
  b.id AS budget_id,
  b.scenario_id,
  s.name AS scenario_name,
  b.fiscal_year,
  b.status AS budget_status,
  bc.category_code,
  bc.category_name,
  bc.category_type,
  bl.line_name,
  bl.budgeted_amount,
  bl.spent_amount,
  bl.remaining_amount,
  bl.variance_amount,
  bl.variance_percent,
  bl.is_over_budget,
  bl.is_near_threshold,
  bl.alert_threshold,

  -- Calcul du taux de consommation
  CASE
    WHEN bl.budgeted_amount = 0 THEN 0
    ELSE ROUND((bl.spent_amount / bl.budgeted_amount * 100)::numeric, 2)
  END AS consumption_rate,

  -- Projection fin d'année (simple prorata temporel)
  CASE
    WHEN EXTRACT(DOY FROM NOW()) = 0 THEN bl.spent_amount
    ELSE ROUND((bl.spent_amount / EXTRACT(DOY FROM NOW()) * 365)::numeric, 2)
  END AS projected_annual_amount,

  -- Variance projetée
  CASE
    WHEN EXTRACT(DOY FROM NOW()) = 0 THEN 0
    ELSE ROUND(((bl.spent_amount / EXTRACT(DOY FROM NOW()) * 365) - bl.budgeted_amount)::numeric, 2)
  END AS projected_variance,

  bl.created_at,
  bl.updated_at
FROM budget_lines bl
JOIN budgets b ON bl.budget_id = b.id
JOIN scenarios s ON b.scenario_id = s.id
JOIN budget_categories bc ON bl.category_id = bc.id
ORDER BY b.fiscal_year DESC, bc.sort_order, bl.line_name;

-- Vue 2: Résumé budgétaire par scénario
CREATE OR REPLACE VIEW budget_summary AS
SELECT
  b.id AS budget_id,
  b.scenario_id,
  s.name AS scenario_name,
  b.fiscal_year,
  b.budget_name,
  b.status,
  b.version,
  b.total_revenue,
  b.total_expense,
  b.total_capex,
  b.total_financing,
  b.net_budget,

  -- Agrégation des réalisés
  COALESCE(SUM(CASE WHEN bc.category_type = 'revenue' THEN bl.spent_amount ELSE 0 END), 0) AS actual_revenue,
  COALESCE(SUM(CASE WHEN bc.category_type = 'expense' THEN bl.spent_amount ELSE 0 END), 0) AS actual_expense,
  COALESCE(SUM(CASE WHEN bc.category_type = 'capex' THEN bl.spent_amount ELSE 0 END), 0) AS actual_capex,
  COALESCE(SUM(CASE WHEN bc.category_type = 'financing' THEN bl.spent_amount ELSE 0 END), 0) AS actual_financing,

  -- Variances totales
  b.total_revenue - COALESCE(SUM(CASE WHEN bc.category_type = 'revenue' THEN bl.spent_amount ELSE 0 END), 0) AS revenue_variance,
  b.total_expense - COALESCE(SUM(CASE WHEN bc.category_type = 'expense' THEN bl.spent_amount ELSE 0 END), 0) AS expense_variance,
  b.total_capex - COALESCE(SUM(CASE WHEN bc.category_type = 'capex' THEN bl.spent_amount ELSE 0 END), 0) AS capex_variance,

  -- Statistiques
  COUNT(bl.id) AS total_lines,
  COUNT(bl.id) FILTER (WHERE bl.is_over_budget) AS over_budget_lines,
  COUNT(bl.id) FILTER (WHERE bl.is_near_threshold) AS near_threshold_lines,

  b.created_at,
  b.approved_at,
  b.approved_by
FROM budgets b
JOIN scenarios s ON b.scenario_id = s.id
LEFT JOIN budget_lines bl ON b.id = bl.budget_id
LEFT JOIN budget_categories bc ON bl.category_id = bc.id
GROUP BY b.id, s.name
ORDER BY b.fiscal_year DESC, s.name;

-- Vue 3: Alertes actives non reconnues
CREATE OR REPLACE VIEW active_budget_alerts AS
SELECT
  ba.id AS alert_id,
  ba.budget_id,
  b.scenario_id,
  s.name AS scenario_name,
  b.fiscal_year,
  ba.budget_line_id,
  bl.line_name,
  bc.category_name,
  ba.alert_type,
  ba.severity,
  ba.message,
  ba.threshold_value,
  ba.current_value,
  ba.variance_percent,
  ba.created_at,
  EXTRACT(DAY FROM NOW() - ba.created_at) AS days_open
FROM budget_alerts ba
JOIN budgets b ON ba.budget_id = b.id
JOIN scenarios s ON b.scenario_id = s.id
LEFT JOIN budget_lines bl ON ba.budget_line_id = bl.id
LEFT JOIN budget_categories bc ON bl.category_id = bc.id
WHERE ba.is_acknowledged = false
ORDER BY
  CASE ba.severity
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  ba.created_at;

-- Vue 4: Historique des révisions
CREATE OR REPLACE VIEW budget_revision_history AS
SELECT
  br.id AS revision_id,
  br.budget_id,
  b.scenario_id,
  s.name AS scenario_name,
  b.fiscal_year,
  br.budget_line_id,
  bl.line_name,
  bc.category_name,
  br.revision_type,
  br.previous_amount,
  br.new_amount,
  br.variance,
  CASE
    WHEN br.previous_amount = 0 THEN 0
    ELSE ROUND((br.variance / br.previous_amount * 100)::numeric, 2)
  END AS variance_percent,
  br.reason,
  br.justification,
  br.status,
  br.requested_by,
  br.approved_by,
  br.created_at,
  br.approved_at
FROM budget_revisions br
JOIN budgets b ON br.budget_id = b.id
JOIN scenarios s ON b.scenario_id = s.id
LEFT JOIN budget_lines bl ON br.budget_line_id = bl.id
LEFT JOIN budget_categories bc ON bl.category_id = bc.id
ORDER BY br.created_at DESC;

-- Vue 5: Performance budgétaire par catégorie
CREATE OR REPLACE VIEW budget_category_performance AS
SELECT
  b.scenario_id,
  s.name AS scenario_name,
  b.fiscal_year,
  bc.category_code,
  bc.category_name,
  bc.category_type,
  COUNT(bl.id) AS total_lines,
  SUM(bl.budgeted_amount) AS total_budgeted,
  SUM(bl.spent_amount) AS total_spent,
  SUM(bl.remaining_amount) AS total_remaining,
  SUM(bl.variance_amount) AS total_variance,
  CASE
    WHEN SUM(bl.budgeted_amount) = 0 THEN 0
    ELSE ROUND((SUM(bl.spent_amount) / SUM(bl.budgeted_amount) * 100)::numeric, 2)
  END AS avg_consumption_rate,
  COUNT(bl.id) FILTER (WHERE bl.is_over_budget) AS over_budget_count,
  COUNT(bl.id) FILTER (WHERE bl.is_near_threshold) AS near_threshold_count
FROM budget_lines bl
JOIN budgets b ON bl.budget_id = b.id
JOIN scenarios s ON b.scenario_id = s.id
JOIN budget_categories bc ON bl.category_id = bc.id
WHERE b.status IN ('approved', 'active')
GROUP BY b.scenario_id, s.name, b.fiscal_year, bc.category_code, bc.category_name, bc.category_type, bc.sort_order
ORDER BY b.fiscal_year DESC, bc.sort_order;

-- =====================================================
-- FONCTIONS
-- =====================================================

-- Fonction 1: Calculer YTD actuals depuis les transactions
CREATE OR REPLACE FUNCTION get_ytd_actuals(
  p_scenario_id UUID,
  p_category_code TEXT,
  p_fiscal_year INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL(12,2);
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := (p_fiscal_year || '-01-01')::DATE;
  v_end_date := LEAST(NOW()::DATE, (p_fiscal_year || '-12-31')::DATE);

  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_total
  FROM transactions t
  WHERE t.scenario_id = p_scenario_id
    AND t.transaction_date BETWEEN v_start_date AND v_end_date
    AND t.category LIKE p_category_code || '%';

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Fonction 2: Synchroniser spent_amount depuis transactions
CREATE OR REPLACE FUNCTION sync_budget_actuals(p_budget_id UUID) RETURNS void AS $$
DECLARE
  v_line RECORD;
  v_spent DECIMAL(12,2);
BEGIN
  FOR v_line IN
    SELECT bl.id, b.scenario_id, b.start_date, b.end_date, bc.category_code
    FROM budget_lines bl
    JOIN budgets b ON bl.budget_id = b.id
    JOIN budget_categories bc ON bl.category_id = bc.id
    WHERE bl.budget_id = p_budget_id
  LOOP
    SELECT COALESCE(SUM(t.amount), 0)
    INTO v_spent
    FROM transactions t
    WHERE t.scenario_id = v_line.scenario_id
      AND t.transaction_date BETWEEN v_line.start_date AND v_line.end_date
      AND t.category LIKE v_line.category_code || '%';

    UPDATE budget_lines
    SET spent_amount = v_spent,
        updated_at = NOW()
    WHERE id = v_line.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction 3: Créer alerte de dépassement
CREATE OR REPLACE FUNCTION create_budget_alert(
  p_budget_line_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_message TEXT
) RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_budget_id UUID;
  v_threshold DECIMAL(12,2);
  v_current DECIMAL(12,2);
  v_variance DECIMAL(5,2);
BEGIN
  SELECT budget_id, budgeted_amount, spent_amount, variance_percent
  INTO v_budget_id, v_threshold, v_current, v_variance
  FROM budget_lines
  WHERE id = p_budget_line_id;

  INSERT INTO budget_alerts (
    budget_id, budget_line_id, alert_type, severity, message,
    threshold_value, current_value, variance_percent
  ) VALUES (
    v_budget_id, p_budget_line_id, p_alert_type, p_severity, p_message,
    v_threshold, v_current, v_variance
  ) RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger 1: Auto-update budget totals when lines change
CREATE OR REPLACE FUNCTION trigger_update_budget_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id UUID;
BEGIN
  v_budget_id := COALESCE(NEW.budget_id, OLD.budget_id);

  UPDATE budgets
  SET
    total_revenue = (
      SELECT COALESCE(SUM(bl.budgeted_amount), 0)
      FROM budget_lines bl
      JOIN budget_categories bc ON bl.category_id = bc.id
      WHERE bl.budget_id = v_budget_id AND bc.category_type = 'revenue'
    ),
    total_expense = (
      SELECT COALESCE(SUM(bl.budgeted_amount), 0)
      FROM budget_lines bl
      JOIN budget_categories bc ON bl.category_id = bc.id
      WHERE bl.budget_id = v_budget_id AND bc.category_type = 'expense'
    ),
    total_capex = (
      SELECT COALESCE(SUM(bl.budgeted_amount), 0)
      FROM budget_lines bl
      JOIN budget_categories bc ON bl.category_id = bc.id
      WHERE bl.budget_id = v_budget_id AND bc.category_type = 'capex'
    ),
    total_financing = (
      SELECT COALESCE(SUM(bl.budgeted_amount), 0)
      FROM budget_lines bl
      JOIN budget_categories bc ON bl.category_id = bc.id
      WHERE bl.budget_id = v_budget_id AND bc.category_type = 'financing'
    ),
    updated_at = NOW()
  WHERE id = v_budget_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_totals
  AFTER INSERT OR UPDATE OR DELETE ON budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_budget_totals();

-- Trigger 2: Auto-create alerts for threshold breaches
CREATE OR REPLACE FUNCTION trigger_check_budget_thresholds()
RETURNS TRIGGER AS $$
BEGIN
  -- Alerte si dépassement budget
  IF NEW.is_over_budget = true AND (OLD IS NULL OR OLD.is_over_budget = false) THEN
    PERFORM create_budget_alert(
      NEW.id,
      'over_budget',
      'critical',
      format('Ligne budgétaire "%s" en dépassement: %s / %s',
        NEW.line_name,
        NEW.spent_amount::TEXT,
        NEW.budgeted_amount::TEXT
      )
    );
  END IF;

  -- Alerte si seuil atteint
  IF NEW.is_near_threshold = true AND (OLD IS NULL OR OLD.is_near_threshold = false) THEN
    PERFORM create_budget_alert(
      NEW.id,
      'near_threshold',
      'warning',
      format('Ligne budgétaire "%s" proche du seuil (%s%%): %s / %s',
        NEW.line_name,
        NEW.alert_threshold::TEXT,
        NEW.spent_amount::TEXT,
        NEW.budgeted_amount::TEXT
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_budget_thresholds
  AFTER INSERT OR UPDATE OF spent_amount ON budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_budget_thresholds();

-- Trigger 3: Update timestamps
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budgets_timestamp
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER update_budget_lines_timestamp
  BEFORE UPDATE ON budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

CREATE TRIGGER update_budget_categories_timestamp
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

-- =====================================================
-- EXEMPLES D'UTILISATION
-- =====================================================

-- Exemple 1: Créer un nouveau budget
/*
INSERT INTO budgets (scenario_id, budget_name, fiscal_year, start_date, end_date, status)
VALUES (
  'scenario-uuid',
  'Budget 2024 - Projet ABC',
  2024,
  '2024-01-01',
  '2024-12-31',
  'draft'
);
*/

-- Exemple 2: Ajouter des lignes budgétaires
/*
INSERT INTO budget_lines (budget_id, category_id, line_name, budgeted_amount)
SELECT
  budget.id,
  cat.id,
  'Revenus locatifs 2024',
  500000
FROM budgets budget
CROSS JOIN budget_categories cat
WHERE budget.budget_name = 'Budget 2024 - Projet ABC'
  AND cat.category_code = 'REV-RENT';
*/

-- Exemple 3: Synchroniser les réalisés
/*
SELECT sync_budget_actuals('budget-uuid');
*/

-- Exemple 4: Analyser les variances
/*
SELECT * FROM budget_variance_analysis
WHERE scenario_id = 'scenario-uuid'
  AND fiscal_year = 2024
  AND is_over_budget = true;
*/

-- Exemple 5: Voir les alertes actives
/*
SELECT * FROM active_budget_alerts
WHERE scenario_id = 'scenario-uuid'
ORDER BY severity, created_at;
*/

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
