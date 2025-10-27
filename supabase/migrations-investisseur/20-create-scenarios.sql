-- =====================================================
-- SCRIPT 20: SYSTÈME DE SCÉNARIOS D'ÉVALUATION
-- =====================================================
-- Description: Système complet de gestion de scénarios avec vote et conversion en projet
-- Dépendances: Script 2 (tables de base)
-- =====================================================

-- 1. Table des scénarios d'évaluation
-- =====================================================
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations de base
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Données financières
  purchase_price DECIMAL(15, 2) NOT NULL,
  initial_fees DECIMAL(15, 2) DEFAULT 0,

  -- Données du promoteur (JSON)
  promoter_data JSONB DEFAULT '{}'::jsonb,
  -- Exemple: {
  --   "monthly_rent": 1500,
  --   "annual_appreciation": 5,
  --   "occupancy_rate": 80,
  --   "management_fees": 10,
  --   "project_duration": 10
  -- }

  -- Termes de paiement optionnels (JSON)
  payment_terms JSONB DEFAULT '[]'::jsonb,
  -- Exemple: [
  --   {"label": "Acompte", "amount_type": "percentage", "percentage": 20, "due_date": "2025-01-01"},
  --   {"label": "Versement final", "amount_type": "fixed_amount", "fixed_amount": 50000, "due_date": "2025-06-01"}
  -- ]

  -- Financement
  payment_type VARCHAR(20) DEFAULT 'cash' CHECK (payment_type IN ('cash', 'financed')),
  down_payment DECIMAL(5, 2) DEFAULT 0, -- %
  interest_rate DECIMAL(5, 2) DEFAULT 0, -- %
  loan_duration INTEGER DEFAULT 25, -- années

  -- Statut et workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_vote', 'approved', 'rejected', 'purchased')),

  -- Relation avec projet converti
  converted_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Métadonnées
  created_by UUID REFERENCES investors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des résultats d'analyse (3 scénarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS scenario_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,

  -- Type de scénario
  scenario_type VARCHAR(20) NOT NULL CHECK (scenario_type IN ('conservative', 'moderate', 'optimistic')),

  -- Données annuelles (JSON array)
  yearly_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Exemple pour chaque année:
  -- {
  --   "year": 1,
  --   "propertyValue": 265000,
  --   "rentalIncome": 13680,
  --   "managementFees": 1368,
  --   "netIncome": 12312,
  --   "cumulativeCashflow": -237688,
  --   "roi": -5.2,
  --   "netLiquidity": 55000,
  --   "remainingDebt": 210000
  -- }

  -- Résumé du scénario (JSON)
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Exemple:
  -- {
  --   "totalReturn": 125.5,
  --   "avgAnnualReturn": 12.55,
  --   "totalNetIncome": 123120,
  --   "finalPropertyValue": 432000,
  --   "breakEvenYear": 4,
  --   "recommendation": "recommended"
  -- }

  -- Évaluation écrite
  evaluation_text TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table des votes sur les scénarios
-- =====================================================
CREATE TABLE IF NOT EXISTS scenario_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,

  -- Vote
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('approve', 'reject')),

  -- Commentaire optionnel
  comment TEXT,

  -- Métadonnées
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Un investisseur ne peut voter qu'une fois par scénario
  UNIQUE(scenario_id, investor_id)
);

-- 4. Table des documents du scénario (documentation promoteur)
-- =====================================================
CREATE TABLE IF NOT EXISTS scenario_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,

  -- Informations fichier
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- URL Supabase Storage
  file_type VARCHAR(100), -- MIME type
  file_size BIGINT, -- en bytes

  -- Métadonnées
  uploaded_by UUID REFERENCES investors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON scenarios(created_by);
CREATE INDEX IF NOT EXISTS idx_scenarios_converted_property ON scenarios(converted_property_id);

CREATE INDEX IF NOT EXISTS idx_scenario_results_scenario ON scenario_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_results_type ON scenario_results(scenario_type);

CREATE INDEX IF NOT EXISTS idx_scenario_votes_scenario ON scenario_votes(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_votes_investor ON scenario_votes(investor_id);

CREATE INDEX IF NOT EXISTS idx_scenario_documents_scenario ON scenario_documents(scenario_id);

-- =====================================================
-- TRIGGER POUR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_scenarios_updated_at();

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer le statut de vote d'un scénario
CREATE OR REPLACE FUNCTION get_scenario_vote_status(scenario_uuid UUID)
RETURNS TABLE(
  total_votes BIGINT,
  approve_votes BIGINT,
  reject_votes BIGINT,
  approval_percentage DECIMAL,
  is_approved BOOLEAN
) AS $$
DECLARE
  total_investors BIGINT;
BEGIN
  -- Compter le nombre total d'investisseurs
  SELECT COUNT(*) INTO total_investors FROM investors;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_votes,
    COUNT(*) FILTER (WHERE vote = 'approve')::BIGINT as approve_votes,
    COUNT(*) FILTER (WHERE vote = 'reject')::BIGINT as reject_votes,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE vote = 'approve')::DECIMAL / COUNT(*)::DECIMAL * 100), 2)
      ELSE 0
    END as approval_percentage,
    -- Approuvé si majorité simple (> 50%) et au moins 2 votes
    CASE
      WHEN COUNT(*) >= 2 AND COUNT(*) FILTER (WHERE vote = 'approve') > COUNT(*) / 2 THEN TRUE
      ELSE FALSE
    END as is_approved
  FROM scenario_votes
  WHERE scenario_id = scenario_uuid;
END;
$$ LANGUAGE plpgsql;

-- Vue pour afficher les scénarios avec leur statut de vote
CREATE OR REPLACE VIEW scenarios_with_votes AS
SELECT
  s.*,
  COALESCE(v.total_votes, 0) as total_votes,
  COALESCE(v.approve_votes, 0) as approve_votes,
  COALESCE(v.reject_votes, 0) as reject_votes,
  COALESCE(v.approval_percentage, 0) as approval_percentage,
  COALESCE(v.is_approved, false) as is_approved
FROM scenarios s
LEFT JOIN LATERAL get_scenario_vote_status(s.id) v ON true;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_documents ENABLE ROW LEVEL SECURITY;

-- Policies pour scenarios
CREATE POLICY "Authenticated users can view scenarios"
  ON scenarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create scenarios"
  ON scenarios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update scenarios"
  ON scenarios FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete scenarios"
  ON scenarios FOR DELETE
  TO authenticated
  USING (true);

-- Policies pour scenario_results
CREATE POLICY "Authenticated users can view scenario results"
  ON scenario_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create scenario results"
  ON scenario_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies pour scenario_votes
CREATE POLICY "Authenticated users can view scenario votes"
  ON scenario_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create votes"
  ON scenario_votes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own votes"
  ON scenario_votes FOR UPDATE
  TO authenticated
  USING (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own votes"
  ON scenario_votes FOR DELETE
  TO authenticated
  USING (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()));

-- Policies pour scenario_documents
CREATE POLICY "Authenticated users can view scenario documents"
  ON scenario_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload scenario documents"
  ON scenario_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scenario documents"
  ON scenario_documents FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- DONNÉES DE TEST (OPTIONNEL)
-- =====================================================

-- Exemple de scénario pour test
-- INSERT INTO scenarios (name, purchase_price, initial_fees, promoter_data, status, created_by)
-- VALUES (
--   'Punta Cana Beach Resort - Phase 1',
--   250000,
--   15000,
--   '{
--     "monthly_rent": 1500,
--     "annual_appreciation": 5,
--     "occupancy_rate": 80,
--     "management_fees": 10,
--     "project_duration": 10
--   }'::jsonb,
--   'draft',
--   (SELECT id FROM investors LIMIT 1)
-- );

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 20: SYSTÈME DE SCÉNARIOS CRÉÉ';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '  - scenarios (scénarios d''évaluation)';
  RAISE NOTICE '  - scenario_results (résultats d''analyse)';
  RAISE NOTICE '  - scenario_votes (votes des investisseurs)';
  RAISE NOTICE '  - scenario_documents (documentation promoteur)';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - get_scenario_vote_status() (calcul statut vote)';
  RAISE NOTICE '';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - scenarios_with_votes (scénarios avec votes)';
  RAISE NOTICE '';
  RAISE NOTICE 'Index et RLS activés ✓';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Prochaine étape:';
  RAISE NOTICE '  1. Créer bucket Storage "scenario-documents"';
  RAISE NOTICE '  2. Implémenter interface de création de scénario';
  RAISE NOTICE '  3. Ajouter système de vote';
  RAISE NOTICE '  4. Permettre conversion en projet';
END $$;
