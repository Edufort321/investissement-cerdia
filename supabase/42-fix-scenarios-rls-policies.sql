-- =====================================================
-- SCRIPT 42: REPARATION DES POLITIQUES RLS POUR SCENARIOS
--
-- Ce script corrige les permissions Row-Level Security (RLS)
-- pour permettre aux utilisateurs authentifies de creer,
-- modifier et supprimer des scenarios.
--
-- Erreur corrigee:
--   "new row violates row-level security policy for table scenarios"
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- Etape 1: Supprimer toutes les anciennes politiques (si elles existent)
DO $$
BEGIN
    -- Scenarios
    DROP POLICY IF EXISTS "Authenticated users can view scenarios" ON scenarios;
    DROP POLICY IF EXISTS "Authenticated users can create scenarios" ON scenarios;
    DROP POLICY IF EXISTS "Authenticated users can update scenarios" ON scenarios;
    DROP POLICY IF EXISTS "Authenticated users can delete scenarios" ON scenarios;

    -- Scenario results
    DROP POLICY IF EXISTS "Authenticated users can view scenario results" ON scenario_results;
    DROP POLICY IF EXISTS "Authenticated users can create scenario results" ON scenario_results;

    -- Scenario votes
    DROP POLICY IF EXISTS "Authenticated users can view scenario votes" ON scenario_votes;
    DROP POLICY IF EXISTS "Authenticated users can create votes" ON scenario_votes;
    DROP POLICY IF EXISTS "Users can update their own votes" ON scenario_votes;
    DROP POLICY IF EXISTS "Users can delete their own votes" ON scenario_votes;

    -- Scenario documents
    DROP POLICY IF EXISTS "Authenticated users can view scenario documents" ON scenario_documents;
    DROP POLICY IF EXISTS "Authenticated users can upload scenario documents" ON scenario_documents;
    DROP POLICY IF EXISTS "Authenticated users can delete scenario documents" ON scenario_documents;

    RAISE NOTICE 'Anciennes politiques supprimees';
END $$;

-- Etape 2: Activer RLS sur toutes les tables scenarios
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_documents ENABLE ROW LEVEL SECURITY;

-- Etape 3: Creer les nouvelles politiques RLS pour scenarios
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

-- Etape 4: Politiques pour scenario_results
CREATE POLICY "Authenticated users can view scenario results"
  ON scenario_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create scenario results"
  ON scenario_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update scenario results"
  ON scenario_results FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete scenario results"
  ON scenario_results FOR DELETE
  TO authenticated
  USING (true);

-- Etape 5: Politiques pour scenario_votes
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

-- Etape 6: Politiques pour scenario_documents
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

-- Verification finale
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename LIKE 'scenario%');

    RAISE NOTICE 'Nombre total de politiques RLS pour scenarios: %', policy_count;

    IF policy_count >= 15 THEN
        RAISE NOTICE '✅ Toutes les politiques RLS ont ete creees avec succes';
    ELSE
        RAISE WARNING '⚠️  Certaines politiques manquent (attendu: 15+, trouve: %)', policy_count;
    END IF;
END $$;

-- Liste de toutes les politiques creees
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'scenario%'
ORDER BY tablename, policyname;

-- Message de confirmation
SELECT 'MIGRATION 42 TERMINEE - Politiques RLS scenarios reparees' AS status;
