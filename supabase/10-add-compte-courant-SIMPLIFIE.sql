-- ==========================================
-- SYSTÈME DE COMPTE COURANT SIMPLIFIÉ
-- Auto-catégorisation des transactions + Vues agrégées
-- (Pas de table séparée - on utilise juste les transactions)
-- ==========================================

-- Étape 1: Ajouter colonnes à la table transactions pour catégorisation
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS project_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS auto_categorized BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN transactions.operation_type IS 'Type d''opération: cout_operation, revenu, depense_projet';
COMMENT ON COLUMN transactions.project_category IS 'Catégorie projet: maintenance, gestion, utilities, renovation, etc.';
COMMENT ON COLUMN transactions.auto_categorized IS 'Transaction catégorisée automatiquement';

-- Étape 2: Fonction pour auto-catégoriser une transaction
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

-- Étape 3: Trigger pour auto-catégoriser lors de l'insertion/modification
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

-- Étape 4: VUE pour le compte courant mensuel (remplace la table current_accounts)
CREATE OR REPLACE VIEW compte_courant_mensuel AS
SELECT
  EXTRACT(YEAR FROM t.date)::INTEGER as year,
  EXTRACT(MONTH FROM t.date)::INTEGER as month,

  -- Totaux par catégorie
  COALESCE(SUM(CASE WHEN operation_type = 'revenu' THEN amount ELSE 0 END), 0) as total_revenues,
  COALESCE(SUM(CASE WHEN operation_type = 'cout_operation' THEN amount ELSE 0 END), 0) as total_operational_costs,
  COALESCE(SUM(CASE WHEN operation_type = 'depense_projet' THEN amount ELSE 0 END), 0) as total_project_expenses,

  -- Détails revenus
  COALESCE(SUM(CASE WHEN operation_type = 'revenu' AND type = 'dividende' THEN amount ELSE 0 END), 0) as rental_income,
  COALESCE(SUM(CASE WHEN operation_type = 'revenu' AND type != 'dividende' THEN amount ELSE 0 END), 0) as other_income,

  -- Détails coûts d'opération
  COALESCE(SUM(CASE WHEN project_category = 'management' THEN amount ELSE 0 END), 0) as management_fees,
  COALESCE(SUM(CASE WHEN project_category = 'utilities' THEN amount ELSE 0 END), 0) as utilities,
  COALESCE(SUM(CASE WHEN project_category = 'insurance' THEN amount ELSE 0 END), 0) as insurance,
  COALESCE(SUM(CASE WHEN project_category = 'maintenance' THEN amount ELSE 0 END), 0) as maintenance,
  COALESCE(SUM(CASE WHEN project_category = 'property_tax' THEN amount ELSE 0 END), 0) as property_taxes,

  -- Détails dépenses projet
  COALESCE(SUM(CASE WHEN project_category = 'renovation' THEN amount ELSE 0 END), 0) as renovation_costs,
  COALESCE(SUM(CASE WHEN project_category = 'furnishing' THEN amount ELSE 0 END), 0) as furnishing_costs,
  COALESCE(SUM(CASE WHEN project_category = 'other_project' THEN amount ELSE 0 END), 0) as other_project_costs,

  -- Balance (calculé automatiquement)
  COALESCE(SUM(CASE WHEN operation_type = 'revenu' THEN amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN operation_type = 'cout_operation' THEN amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN operation_type = 'depense_projet' THEN amount ELSE 0 END), 0) as net_income,

  -- Métadonnées
  COUNT(*) as nombre_transactions,
  MAX(t.updated_at) as derniere_mise_a_jour

FROM transactions t
WHERE t.status = 'complete'
GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
ORDER BY year DESC, month DESC;

-- Étape 5: Vue pour le compte courant par projet
CREATE OR REPLACE VIEW compte_courant_par_projet AS
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
  ) as net_income,

  COUNT(*) as nombre_transactions

FROM properties p
LEFT JOIN transactions t ON t.property_id = p.id AND t.status = 'complete'
GROUP BY p.id, p.name, p.location, EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
ORDER BY year DESC, month DESC, p.name;

-- Étape 6: Fonction pour obtenir un résumé du compte courant d'un mois
CREATE OR REPLACE FUNCTION get_compte_courant_summary(p_year INTEGER, p_month INTEGER)
RETURNS TABLE (
  category VARCHAR(50),
  label VARCHAR(100),
  amount DECIMAL(12, 2),
  type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  WITH account AS (
    SELECT * FROM compte_courant_mensuel WHERE year = p_year AND month = p_month
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
  '✅ SYSTÈME DE COMPTE COURANT SIMPLIFIÉ CRÉÉ' as status,
  'Tables: transactions (updated avec auto-catégorisation)' as tables,
  'Vues: compte_courant_mensuel, compte_courant_par_projet' as views,
  'Triggers: Auto-catégorisation temps réel' as triggers,
  'Avantage: Pas de redondance, tout basé sur les transactions!' as note;

-- Exemples d'utilisation:
COMMENT ON VIEW compte_courant_mensuel IS '
Vue agrégée du compte courant par mois - PAS de table séparée!

Exemples:

1. Voir le compte du mois en cours:
   SELECT * FROM compte_courant_mensuel
   WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
     AND month = EXTRACT(MONTH FROM CURRENT_DATE);

2. Voir l''historique complet:
   SELECT * FROM compte_courant_mensuel
   ORDER BY year DESC, month DESC;

3. Voir par projet pour un mois:
   SELECT * FROM compte_courant_par_projet
   WHERE year = 2025 AND month = 1;

4. Résumé détaillé d''un mois:
   SELECT * FROM get_compte_courant_summary(2025, 1);

5. Catégoriser manuellement une transaction:
   UPDATE transactions
   SET operation_type = ''cout_operation'',
       project_category = ''utilities'',
       auto_categorized = FALSE
   WHERE id = ''uuid'';

Tout est calculé en temps réel depuis les transactions!
Pas de duplication de données = pas de problème de synchronisation!
';
