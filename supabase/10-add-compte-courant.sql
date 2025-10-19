-- ==========================================
-- SYSTÈME DE COMPTE COURANT 2025
-- Gestion des opérations courantes avec catégorisation automatique
-- ==========================================

-- Étape 1: Ajouter colonnes à la table transactions pour catégorisation
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS project_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS auto_categorized BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN transactions.operation_type IS 'Type d''opération: cout_operation, revenu, depense_projet';
COMMENT ON COLUMN transactions.project_category IS 'Catégorie projet: maintenance, gestion, utilities, renovation, etc.';
COMMENT ON COLUMN transactions.auto_categorized IS 'Transaction catégorisée automatiquement';

-- Étape 2: Créer une table pour les comptes courants (regroupement mensuel)
CREATE TABLE IF NOT EXISTS current_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Période
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- Totaux par catégorie
  total_revenues DECIMAL(12, 2) DEFAULT 0,
  total_operational_costs DECIMAL(12, 2) DEFAULT 0,
  total_project_expenses DECIMAL(12, 2) DEFAULT 0,

  -- Détails revenus
  rental_income DECIMAL(12, 2) DEFAULT 0,
  other_income DECIMAL(12, 2) DEFAULT 0,

  -- Détails coûts d'opération
  management_fees DECIMAL(12, 2) DEFAULT 0,
  utilities DECIMAL(12, 2) DEFAULT 0,
  insurance DECIMAL(12, 2) DEFAULT 0,
  maintenance DECIMAL(12, 2) DEFAULT 0,
  property_taxes DECIMAL(12, 2) DEFAULT 0,

  -- Détails dépenses projet
  renovation_costs DECIMAL(12, 2) DEFAULT 0,
  furnishing_costs DECIMAL(12, 2) DEFAULT 0,
  other_project_costs DECIMAL(12, 2) DEFAULT 0,

  -- Balance
  net_income DECIMAL(12, 2) GENERATED ALWAYS AS (
    total_revenues - total_operational_costs - total_project_expenses
  ) STORED,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte unicité période
  UNIQUE(year, month)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_current_accounts_period ON current_accounts(year, month);

-- Étape 3: Fonction pour auto-catégoriser une transaction
CREATE OR REPLACE FUNCTION auto_categorize_transaction(
  p_transaction_id UUID,
  p_description TEXT,
  p_type VARCHAR(20),
  p_property_id UUID
) RETURNS VOID AS $$
DECLARE
  v_operation_type VARCHAR(50);
  v_project_category VARCHAR(50);
  v_lower_desc TEXT := LOWER(p_description);
BEGIN
  -- Déterminer le type d'opération basé sur la description
  IF p_type = 'dividende' OR v_lower_desc LIKE '%loyer%' OR v_lower_desc LIKE '%revenu%' OR v_lower_desc LIKE '%rental%' THEN
    v_operation_type := 'revenu';
  ELSIF
    v_lower_desc LIKE '%rénovation%' OR
    v_lower_desc LIKE '%renovation%' OR
    v_lower_desc LIKE '%meuble%' OR
    v_lower_desc LIKE '%furniture%' OR
    v_lower_desc LIKE '%amélioration%' OR
    v_lower_desc LIKE '%construction%'
  THEN
    v_operation_type := 'depense_projet';

    -- Catégoriser le projet
    IF v_lower_desc LIKE '%rénovation%' OR v_lower_desc LIKE '%renovation%' THEN
      v_project_category := 'renovation';
    ELSIF v_lower_desc LIKE '%meuble%' OR v_lower_desc LIKE '%furniture%' THEN
      v_project_category := 'furnishing';
    ELSE
      v_project_category := 'other_project';
    END IF;

  ELSIF
    v_lower_desc LIKE '%gestion%' OR
    v_lower_desc LIKE '%management%' OR
    v_lower_desc LIKE '%électricité%' OR
    v_lower_desc LIKE '%electricity%' OR
    v_lower_desc LIKE '%eau%' OR
    v_lower_desc LIKE '%water%' OR
    v_lower_desc LIKE '%assurance%' OR
    v_lower_desc LIKE '%insurance%' OR
    v_lower_desc LIKE '%taxe%' OR
    v_lower_desc LIKE '%tax%' OR
    v_lower_desc LIKE '%maintenance%' OR
    v_lower_desc LIKE '%entretien%'
  THEN
    v_operation_type := 'cout_operation';

    -- Catégoriser l'opération
    IF v_lower_desc LIKE '%gestion%' OR v_lower_desc LIKE '%management%' THEN
      v_project_category := 'management';
    ELSIF v_lower_desc LIKE '%électricité%' OR v_lower_desc LIKE '%electricity%' OR v_lower_desc LIKE '%eau%' OR v_lower_desc LIKE '%water%' THEN
      v_project_category := 'utilities';
    ELSIF v_lower_desc LIKE '%assurance%' OR v_lower_desc LIKE '%insurance%' THEN
      v_project_category := 'insurance';
    ELSIF v_lower_desc LIKE '%taxe%' OR v_lower_desc LIKE '%tax%' THEN
      v_project_category := 'property_tax';
    ELSIF v_lower_desc LIKE '%maintenance%' OR v_lower_desc LIKE '%entretien%' THEN
      v_project_category := 'maintenance';
    ELSE
      v_project_category := 'other_operation';
    END IF;
  ELSE
    -- Par défaut basé sur le type de transaction
    IF p_type IN ('investissement', 'dividende') THEN
      v_operation_type := 'revenu';
    ELSE
      v_operation_type := 'cout_operation';
      v_project_category := 'other_operation';
    END IF;
  END IF;

  -- Mettre à jour la transaction
  UPDATE transactions
  SET
    operation_type = v_operation_type,
    project_category = v_project_category,
    auto_categorized = TRUE
  WHERE id = p_transaction_id;

END;
$$ LANGUAGE plpgsql;

-- Étape 4: Trigger pour auto-catégoriser lors de l'insertion/modification
CREATE OR REPLACE FUNCTION trigger_auto_categorize_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-catégoriser seulement si pas déjà catégorisé manuellement
  IF NEW.operation_type IS NULL OR NEW.auto_categorized = TRUE THEN
    PERFORM auto_categorize_transaction(
      NEW.id,
      NEW.description,
      NEW.type,
      NEW.property_id
    );

    -- Recharger la transaction pour avoir les valeurs mises à jour
    SELECT operation_type, project_category, auto_categorized
    INTO NEW.operation_type, NEW.project_category, NEW.auto_categorized
    FROM transactions
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_categorize_on_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_categorize_transaction();

CREATE TRIGGER trigger_auto_categorize_on_update
AFTER UPDATE ON transactions
FOR EACH ROW
WHEN (OLD.description IS DISTINCT FROM NEW.description OR OLD.type IS DISTINCT FROM NEW.type)
EXECUTE FUNCTION trigger_auto_categorize_transaction();

-- Étape 5: Fonction pour mettre à jour le compte courant d'un mois
CREATE OR REPLACE FUNCTION update_current_account_for_month(
  p_year INTEGER,
  p_month INTEGER
) RETURNS VOID AS $$
DECLARE
  v_account_id UUID;
  v_revenues DECIMAL(12, 2);
  v_op_costs DECIMAL(12, 2);
  v_proj_expenses DECIMAL(12, 2);

  v_rental DECIMAL(12, 2);
  v_other_income DECIMAL(12, 2);

  v_management DECIMAL(12, 2);
  v_utilities DECIMAL(12, 2);
  v_insurance DECIMAL(12, 2);
  v_maintenance DECIMAL(12, 2);
  v_taxes DECIMAL(12, 2);

  v_renovation DECIMAL(12, 2);
  v_furnishing DECIMAL(12, 2);
  v_other_proj DECIMAL(12, 2);
BEGIN
  -- Calculer les totaux pour le mois
  SELECT
    COALESCE(SUM(CASE WHEN operation_type = 'revenu' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type = 'cout_operation' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type = 'depense_projet' THEN amount ELSE 0 END), 0),

    COALESCE(SUM(CASE WHEN operation_type = 'revenu' AND type = 'dividende' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN operation_type = 'revenu' AND type != 'dividende' THEN amount ELSE 0 END), 0),

    COALESCE(SUM(CASE WHEN project_category = 'management' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN project_category = 'utilities' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN project_category = 'insurance' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN project_category = 'maintenance' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN project_category = 'property_tax' THEN amount ELSE 0 END), 0),

    COALESCE(SUM(CASE WHEN project_category = 'renovation' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN project_category = 'furnishing' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN project_category = 'other_project' THEN amount ELSE 0 END), 0)
  INTO
    v_revenues, v_op_costs, v_proj_expenses,
    v_rental, v_other_income,
    v_management, v_utilities, v_insurance, v_maintenance, v_taxes,
    v_renovation, v_furnishing, v_other_proj
  FROM transactions
  WHERE
    EXTRACT(YEAR FROM date) = p_year
    AND EXTRACT(MONTH FROM date) = p_month
    AND status = 'complete';

  -- Insérer ou mettre à jour le compte courant
  INSERT INTO current_accounts (
    year, month,
    total_revenues, total_operational_costs, total_project_expenses,
    rental_income, other_income,
    management_fees, utilities, insurance, maintenance, property_taxes,
    renovation_costs, furnishing_costs, other_project_costs
  ) VALUES (
    p_year, p_month,
    v_revenues, v_op_costs, v_proj_expenses,
    v_rental, v_other_income,
    v_management, v_utilities, v_insurance, v_maintenance, v_taxes,
    v_renovation, v_furnishing, v_other_proj
  )
  ON CONFLICT (year, month) DO UPDATE SET
    total_revenues = v_revenues,
    total_operational_costs = v_op_costs,
    total_project_expenses = v_proj_expenses,
    rental_income = v_rental,
    other_income = v_other_income,
    management_fees = v_management,
    utilities = v_utilities,
    insurance = v_insurance,
    maintenance = v_maintenance,
    property_taxes = v_taxes,
    renovation_costs = v_renovation,
    furnishing_costs = v_furnishing,
    other_project_costs = v_other_proj,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- Étape 6: Trigger pour mettre à jour le compte courant automatiquement
CREATE OR REPLACE FUNCTION trigger_update_current_account()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Déterminer le mois affecté
  IF TG_OP = 'DELETE' THEN
    v_year := EXTRACT(YEAR FROM OLD.date);
    v_month := EXTRACT(MONTH FROM OLD.date);
  ELSE
    v_year := EXTRACT(YEAR FROM NEW.date);
    v_month := EXTRACT(MONTH FROM NEW.date);
  END IF;

  -- Mettre à jour le compte courant du mois
  PERFORM update_current_account_for_month(v_year, v_month);

  -- Si UPDATE et que la date a changé, mettre à jour aussi l'ancien mois
  IF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
    PERFORM update_current_account_for_month(
      EXTRACT(YEAR FROM OLD.date),
      EXTRACT(MONTH FROM OLD.date)
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_current_account_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_update_current_account();

-- Étape 7: Vue pour le compte courant par projet
CREATE OR REPLACE VIEW current_account_by_project AS
SELECT
  p.id as property_id,
  p.name as property_name,
  p.location,
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  EXTRACT(MONTH FROM t.date)::INTEGER as month,

  SUM(CASE WHEN t.operation_type = 'revenu' THEN t.amount ELSE 0 END) as revenues,
  SUM(CASE WHEN t.operation_type = 'cout_operation' THEN t.amount ELSE 0 END) as operational_costs,
  SUM(CASE WHEN t.operation_type = 'depense_projet' THEN t.amount ELSE 0 END) as project_expenses,
  SUM(
    CASE WHEN t.operation_type = 'revenu' THEN t.amount ELSE 0 END -
    CASE WHEN t.operation_type = 'cout_operation' THEN t.amount ELSE 0 END -
    CASE WHEN t.operation_type = 'depense_projet' THEN t.amount ELSE 0 END
  ) as net_income

FROM properties p
LEFT JOIN transactions t ON t.property_id = p.id AND t.status = 'complete'
GROUP BY p.id, p.name, p.location, EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
ORDER BY year DESC, month DESC, p.name;

-- Étape 8: Fonction pour obtenir un résumé du compte courant
CREATE OR REPLACE FUNCTION get_current_account_summary(p_year INTEGER, p_month INTEGER)
RETURNS TABLE (
  category VARCHAR(50),
  label VARCHAR(100),
  amount DECIMAL(12, 2),
  type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  WITH account AS (
    SELECT * FROM current_accounts WHERE year = p_year AND month = p_month
  )
  SELECT 'revenues'::VARCHAR(50), 'Revenus locatifs'::VARCHAR(100), a.rental_income, 'revenue'::VARCHAR(20) FROM account a
  UNION ALL
  SELECT 'revenues', 'Autres revenus', a.other_income, 'revenue' FROM account a
  UNION ALL
  SELECT 'operations', 'Frais de gestion', a.management_fees, 'expense' FROM account a
  UNION ALL
  SELECT 'operations', 'Services publics', a.utilities, 'expense' FROM account a
  UNION ALL
  SELECT 'operations', 'Assurances', a.insurance, 'expense' FROM account a
  UNION ALL
  SELECT 'operations', 'Maintenance', a.maintenance, 'expense' FROM account a
  UNION ALL
  SELECT 'operations', 'Taxes foncières', a.property_taxes, 'expense' FROM account a
  UNION ALL
  SELECT 'projects', 'Rénovations', a.renovation_costs, 'expense' FROM account a
  UNION ALL
  SELECT 'projects', 'Ameublement', a.furnishing_costs, 'expense' FROM account a
  UNION ALL
  SELECT 'projects', 'Autres dépenses projet', a.other_project_costs, 'expense' FROM account a;
END;
$$ LANGUAGE plpgsql;

-- Vérification finale
SELECT
  '✅ SYSTÈME DE COMPTE COURANT CRÉÉ' as status,
  'Tables: transactions (updated), current_accounts (new)' as tables,
  'Triggers: Auto-catégorisation + Mise à jour compte courant' as triggers,
  'Vue: current_account_by_project' as views;
