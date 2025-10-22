-- =====================================================
-- SCRIPT 35: GESTION DE PROJET
-- =====================================================
-- Description: Système complet de gestion de projet
--              incluant phases, jalons, risques, et entrepreneurs
-- Dépendances: Script 2 (tables de base)
-- =====================================================

-- =====================================================
-- TABLE: CONTRACTORS (ENTREPRENEURS/FOURNISSEURS)
-- =====================================================
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  specialty TEXT, -- Type de travaux (plomberie, électricité, etc.)
  license_number TEXT,
  insurance_expiry DATE,
  status TEXT CHECK (status IN ('active', 'inactive', 'blacklisted')) DEFAULT 'active',
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5), -- Note sur 5
  total_projects INTEGER DEFAULT 0,
  total_value DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: PROJECT_PHASES (PHASES DE PROJET)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  description TEXT,
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'delayed', 'on_hold', 'cancelled')) DEFAULT 'not_started',
  progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100) DEFAULT 0,
  budget_allocated DECIMAL(12,2),
  budget_spent DECIMAL(12,2) DEFAULT 0,
  responsible_person TEXT,
  dependencies TEXT[], -- IDs des phases dépendantes
  critical_path BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: PROJECT_MILESTONES (JALONS CRITIQUES)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  milestone_name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completion_date DATE,
  status TEXT CHECK (status IN ('pending', 'completed', 'missed', 'at_risk')) DEFAULT 'pending',
  importance TEXT CHECK (importance IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  deliverables TEXT[], -- Liste des livrables attendus
  completion_criteria TEXT,
  responsible_person TEXT,
  notification_days_before INTEGER DEFAULT 7, -- Notification X jours avant
  is_payment_trigger BOOLEAN DEFAULT false, -- Déclenche un paiement
  payment_amount DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: PROJECT_RISKS (REGISTRE DES RISQUES)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  risk_title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- Financier, Technique, Légal, Environnemental, etc.
  probability TEXT CHECK (probability IN ('very_low', 'low', 'medium', 'high', 'very_high')) DEFAULT 'medium',
  impact TEXT CHECK (impact IN ('very_low', 'low', 'medium', 'high', 'very_high')) DEFAULT 'medium',
  risk_score INTEGER, -- Calculé automatiquement (probabilité * impact)
  status TEXT CHECK (status IN ('identified', 'analyzing', 'mitigating', 'monitoring', 'closed')) DEFAULT 'identified',
  mitigation_strategy TEXT,
  contingency_plan TEXT,
  owner TEXT, -- Responsable du risque
  identified_date DATE DEFAULT CURRENT_DATE,
  review_date DATE,
  closure_date DATE,
  actual_impact DECIMAL(12,2), -- Impact réel si le risque se matérialise
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: PROJECT_ASSIGNMENTS (AFFECTATIONS)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  assignment_type TEXT CHECK (assignment_type IN ('contract', 'subcontract', 'consultation', 'supply')) DEFAULT 'contract',
  description TEXT NOT NULL,
  contract_value DECIMAL(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'active', 'completed', 'terminated', 'disputed')) DEFAULT 'draft',
  payment_terms TEXT, -- Net 30, 50/50, etc.
  work_completed_percentage INTEGER CHECK (work_completed_percentage >= 0 AND work_completed_percentage <= 100) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  retention_percentage INTEGER DEFAULT 10,
  retention_amount DECIMAL(12,2),
  performance_rating DECIMAL(3,2) CHECK (performance_rating >= 0 AND performance_rating <= 5),
  contract_document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: PROJECT_DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  document_type TEXT CHECK (document_type IN ('contract', 'permit', 'plan', 'invoice', 'report', 'photo', 'other')) NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- en bytes
  uploaded_by TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_confidential BOOLEAN DEFAULT false,
  expiry_date DATE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES POUR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_contractors_specialty ON contractors(specialty);
CREATE INDEX IF NOT EXISTS idx_project_phases_scenario ON project_phases(scenario_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_status ON project_phases(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_scenario ON project_milestones(scenario_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_due_date ON project_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_risks_scenario ON project_risks(scenario_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_status ON project_risks(status);
CREATE INDEX IF NOT EXISTS idx_project_assignments_scenario ON project_assignments(scenario_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_contractor ON project_assignments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_scenario ON project_documents(scenario_id);

-- =====================================================
-- FONCTION: CALCULER SCORE DE RISQUE
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_risk_score(
  p_probability TEXT,
  p_impact TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_prob_value INTEGER;
  v_impact_value INTEGER;
BEGIN
  -- Convertir probabilité en valeur numérique (1-5)
  v_prob_value := CASE p_probability
    WHEN 'very_low' THEN 1
    WHEN 'low' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'high' THEN 4
    WHEN 'very_high' THEN 5
    ELSE 3
  END;

  -- Convertir impact en valeur numérique (1-5)
  v_impact_value := CASE p_impact
    WHEN 'very_low' THEN 1
    WHEN 'low' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'high' THEN 4
    WHEN 'very_high' THEN 5
    ELSE 3
  END;

  -- Score = Probabilité * Impact (1-25)
  RETURN v_prob_value * v_impact_value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGER: AUTO-CALCULER SCORE DE RISQUE
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_calculate_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score := calculate_risk_score(NEW.probability, NEW.impact);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_risk_score ON project_risks;
CREATE TRIGGER auto_calculate_risk_score
BEFORE INSERT OR UPDATE OF probability, impact ON project_risks
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_risk_score();

-- =====================================================
-- TRIGGER: AUTO-CALCULER MONTANT DE RÉTENTION
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_calculate_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.retention_percentage IS NOT NULL THEN
    NEW.retention_amount := NEW.contract_value * (NEW.retention_percentage / 100.0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_retention ON project_assignments;
CREATE TRIGGER auto_calculate_retention
BEFORE INSERT OR UPDATE OF contract_value, retention_percentage ON project_assignments
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_retention();

-- =====================================================
-- TRIGGER: METTRE À JOUR STATUT JALON (AT RISK)
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_milestone_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le jalon n'est pas complété et que la date d'échéance approche (7 jours)
  IF NEW.status = 'pending' AND NEW.completion_date IS NULL THEN
    IF NEW.due_date <= CURRENT_DATE + INTERVAL '7 days' AND NEW.due_date > CURRENT_DATE THEN
      NEW.status := 'at_risk';
    ELSIF NEW.due_date < CURRENT_DATE THEN
      NEW.status := 'missed';
    END IF;
  END IF;

  -- Si complété, enregistrer la date
  IF NEW.status = 'completed' AND NEW.completion_date IS NULL THEN
    NEW.completion_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_milestone_status ON project_milestones;
CREATE TRIGGER auto_update_milestone_status
BEFORE INSERT OR UPDATE ON project_milestones
FOR EACH ROW
EXECUTE FUNCTION trigger_update_milestone_status();

-- =====================================================
-- TRIGGER: METTRE À JOUR STATISTIQUES CONTRACTOR
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_contractor_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le nombre de projets et la valeur totale
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE contractors
    SET
      total_projects = (
        SELECT COUNT(DISTINCT scenario_id)
        FROM project_assignments
        WHERE contractor_id = NEW.contractor_id
      ),
      total_value = (
        SELECT COALESCE(SUM(contract_value), 0)
        FROM project_assignments
        WHERE contractor_id = NEW.contractor_id
      ),
      updated_at = NOW()
    WHERE id = NEW.contractor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_contractor_stats ON project_assignments;
CREATE TRIGGER auto_update_contractor_stats
AFTER INSERT OR UPDATE OF contract_value ON project_assignments
FOR EACH ROW
WHEN (NEW.contractor_id IS NOT NULL)
EXECUTE FUNCTION trigger_update_contractor_stats();

-- =====================================================
-- TRIGGER: AUTO-UPDATE TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contractors_timestamp ON contractors;
CREATE TRIGGER update_contractors_timestamp
BEFORE UPDATE ON contractors
FOR EACH ROW
EXECUTE FUNCTION trigger_update_timestamp();

DROP TRIGGER IF EXISTS update_project_phases_timestamp ON project_phases;
CREATE TRIGGER update_project_phases_timestamp
BEFORE UPDATE ON project_phases
FOR EACH ROW
EXECUTE FUNCTION trigger_update_timestamp();

DROP TRIGGER IF EXISTS update_project_milestones_timestamp ON project_milestones;
CREATE TRIGGER update_project_milestones_timestamp
BEFORE UPDATE ON project_milestones
FOR EACH ROW
EXECUTE FUNCTION trigger_update_timestamp();

DROP TRIGGER IF EXISTS update_project_risks_timestamp ON project_risks;
CREATE TRIGGER update_project_risks_timestamp
BEFORE UPDATE ON project_risks
FOR EACH ROW
EXECUTE FUNCTION trigger_update_timestamp();

DROP TRIGGER IF EXISTS update_project_assignments_timestamp ON project_assignments;
CREATE TRIGGER update_project_assignments_timestamp
BEFORE UPDATE ON project_assignments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_timestamp();

-- =====================================================
-- VUE: PROJECT_PROGRESS (PROGRÈS GLOBAL PAR PROJET)
-- =====================================================
CREATE OR REPLACE VIEW project_progress AS
SELECT
  s.id as scenario_id,
  s.name as scenario_name,
  COUNT(DISTINCT pp.id) as total_phases,
  COUNT(DISTINCT CASE WHEN pp.status = 'completed' THEN pp.id END) as completed_phases,
  COUNT(DISTINCT CASE WHEN pp.status = 'in_progress' THEN pp.id END) as active_phases,
  COUNT(DISTINCT CASE WHEN pp.status = 'delayed' THEN pp.id END) as delayed_phases,
  ROUND(AVG(pp.progress_percentage), 1) as overall_progress,
  SUM(pp.budget_allocated) as total_budget,
  SUM(pp.budget_spent) as total_spent,
  CASE
    WHEN SUM(pp.budget_allocated) > 0 THEN
      ROUND((SUM(pp.budget_spent) / SUM(pp.budget_allocated) * 100), 1)
    ELSE 0
  END as budget_utilization,
  COUNT(DISTINCT pm.id) as total_milestones,
  COUNT(DISTINCT CASE WHEN pm.status = 'completed' THEN pm.id END) as completed_milestones,
  COUNT(DISTINCT CASE WHEN pm.status = 'missed' THEN pm.id END) as missed_milestones,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.status NOT IN ('closed')) as active_risks,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.risk_score >= 15) as high_risks,
  COUNT(DISTINCT pa.id) as total_assignments,
  SUM(pa.contract_value) as total_contract_value,
  SUM(pa.amount_paid) as total_paid_to_contractors
FROM scenarios s
LEFT JOIN project_phases pp ON s.id = pp.scenario_id
LEFT JOIN project_milestones pm ON s.id = pm.scenario_id
LEFT JOIN project_risks pr ON s.id = pr.scenario_id
LEFT JOIN project_assignments pa ON s.id = pa.scenario_id
WHERE s.status = 'purchased'
GROUP BY s.id, s.name
ORDER BY s.name;

-- =====================================================
-- VUE: CRITICAL_MILESTONES (JALONS CRITIQUES À VENIR)
-- =====================================================
CREATE OR REPLACE VIEW critical_milestones AS
SELECT
  pm.id,
  pm.scenario_id,
  s.name as scenario_name,
  pm.milestone_name,
  pm.due_date,
  pm.status,
  pm.importance,
  pm.responsible_person,
  CURRENT_DATE - pm.due_date as days_overdue,
  pm.due_date - CURRENT_DATE as days_remaining,
  CASE
    WHEN pm.due_date < CURRENT_DATE AND pm.status != 'completed' THEN 'Overdue'
    WHEN pm.due_date <= CURRENT_DATE + INTERVAL '7 days' AND pm.status != 'completed' THEN 'Urgent'
    WHEN pm.due_date <= CURRENT_DATE + INTERVAL '30 days' AND pm.status != 'completed' THEN 'Upcoming'
    ELSE 'Future'
  END as urgency,
  pp.phase_name
FROM project_milestones pm
JOIN scenarios s ON pm.scenario_id = s.id
LEFT JOIN project_phases pp ON pm.phase_id = pp.id
WHERE pm.status IN ('pending', 'at_risk', 'missed')
  AND s.status = 'purchased'
ORDER BY pm.due_date ASC;

-- =====================================================
-- VUE: HIGH_RISK_ITEMS (RISQUES ÉLEVÉS)
-- =====================================================
CREATE OR REPLACE VIEW high_risk_items AS
SELECT
  pr.id,
  pr.scenario_id,
  s.name as scenario_name,
  pr.risk_title,
  pr.category,
  pr.probability,
  pr.impact,
  pr.risk_score,
  pr.status,
  pr.owner,
  pr.mitigation_strategy,
  pp.phase_name,
  CASE
    WHEN pr.risk_score >= 20 THEN 'Critical'
    WHEN pr.risk_score >= 15 THEN 'High'
    WHEN pr.risk_score >= 9 THEN 'Medium'
    ELSE 'Low'
  END as risk_level
FROM project_risks pr
JOIN scenarios s ON pr.scenario_id = s.id
LEFT JOIN project_phases pp ON pr.phase_id = pp.id
WHERE pr.status NOT IN ('closed')
  AND pr.risk_score >= 15
  AND s.status = 'purchased'
ORDER BY pr.risk_score DESC, pr.identified_date ASC;

-- =====================================================
-- VUE: CONTRACTOR_PERFORMANCE (PERFORMANCE ENTREPRENEURS)
-- =====================================================
CREATE OR REPLACE VIEW contractor_performance AS
SELECT
  c.id as contractor_id,
  c.company_name,
  c.specialty,
  c.status,
  c.rating,
  c.total_projects,
  c.total_value,
  COUNT(pa.id) as active_assignments,
  SUM(pa.contract_value) FILTER (WHERE pa.status = 'active') as active_contract_value,
  ROUND(AVG(pa.work_completed_percentage) FILTER (WHERE pa.status = 'active'), 1) as avg_completion,
  SUM(pa.amount_paid) as total_paid,
  COUNT(pa.id) FILTER (WHERE pa.status = 'completed') as completed_assignments,
  ROUND(AVG(pa.performance_rating) FILTER (WHERE pa.performance_rating IS NOT NULL), 2) as avg_performance,
  MAX(pa.end_date) FILTER (WHERE pa.status = 'active') as next_deadline
FROM contractors c
LEFT JOIN project_assignments pa ON c.id = pa.contractor_id
WHERE c.status = 'active'
GROUP BY c.id, c.company_name, c.specialty, c.status, c.rating, c.total_projects, c.total_value
ORDER BY c.company_name;

-- =====================================================
-- FONCTION: OBTENIR PHASES AVEC DÉPENDANCES
-- =====================================================
CREATE OR REPLACE FUNCTION get_phase_dependencies(
  p_scenario_id UUID
)
RETURNS TABLE (
  phase_id UUID,
  phase_name TEXT,
  status TEXT,
  depends_on TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.phase_name,
    pp.status,
    pp.dependencies
  FROM project_phases pp
  WHERE pp.scenario_id = p_scenario_id
  ORDER BY pp.planned_start_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: IDENTIFIER CHEMINS CRITIQUES
-- =====================================================
CREATE OR REPLACE FUNCTION identify_critical_path(
  p_scenario_id UUID
)
RETURNS TABLE (
  phase_id UUID,
  phase_name TEXT,
  duration_days INTEGER,
  is_critical BOOLEAN
) AS $$
BEGIN
  -- Logique simplifiée pour identifier les phases sur le chemin critique
  -- Une phase est critique si elle n'a pas de marge de manoeuvre
  RETURN QUERY
  WITH phase_durations AS (
    SELECT
      pp.id,
      pp.phase_name,
      pp.planned_end_date - pp.planned_start_date as duration,
      pp.critical_path,
      pp.status,
      ARRAY_LENGTH(pp.dependencies, 1) as dep_count
    FROM project_phases pp
    WHERE pp.scenario_id = p_scenario_id
  )
  SELECT
    pd.id,
    pd.phase_name,
    pd.duration,
    COALESCE(pd.critical_path, false) OR (pd.dep_count > 0 AND pd.status IN ('not_started', 'in_progress')) as is_critical
  FROM phase_durations pd
  ORDER BY pd.duration DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 35: GESTION DE PROJET CRÉÉ';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '  - contractors: Entrepreneurs et fournisseurs';
  RAISE NOTICE '  - project_phases: Phases de projet avec dépendances';
  RAISE NOTICE '  - project_milestones: Jalons critiques';
  RAISE NOTICE '  - project_risks: Registre des risques';
  RAISE NOTICE '  - project_assignments: Affectations entrepreneurs';
  RAISE NOTICE '  - project_documents: Documents de projet';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - project_progress: Progrès global par projet';
  RAISE NOTICE '  - critical_milestones: Jalons critiques à venir';
  RAISE NOTICE '  - high_risk_items: Risques élevés';
  RAISE NOTICE '  - contractor_performance: Performance entrepreneurs';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - calculate_risk_score(): Calcul score de risque';
  RAISE NOTICE '  - get_phase_dependencies(): Obtenir dépendances';
  RAISE NOTICE '  - identify_critical_path(): Identifier chemin critique';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Triggers créés:';
  RAISE NOTICE '  - Auto-calcul score risque';
  RAISE NOTICE '  - Auto-calcul montant rétention';
  RAISE NOTICE '  - Auto-update statut jalons';
  RAISE NOTICE '  - Auto-update stats entrepreneurs';
  RAISE NOTICE ' ';
  RAISE NOTICE '✓ Système de gestion de projet complet activé!';
END $$;
