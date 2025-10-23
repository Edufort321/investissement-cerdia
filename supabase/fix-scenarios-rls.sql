-- =====================================================
-- FIX: Politiques RLS pour table scenarios
-- =====================================================
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Supprimer les anciennes politiques (si elles existent)
DROP POLICY IF EXISTS "Authenticated users can view scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can create scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can delete scenarios" ON scenarios;

-- 2. Vérifier que RLS est activé
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- 3. Recréer les politiques avec permissions complètes pour utilisateurs authentifiés
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
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scenarios"
  ON scenarios FOR DELETE
  TO authenticated
  USING (true);

-- 4. Vérifier les politiques pour scenario_results
DROP POLICY IF EXISTS "Authenticated users can view scenario results" ON scenario_results;
DROP POLICY IF EXISTS "Authenticated users can create scenario results" ON scenario_results;

ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;

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
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scenario results"
  ON scenario_results FOR DELETE
  TO authenticated
  USING (true);

-- 5. Vérifier les politiques pour scenario_votes
DROP POLICY IF EXISTS "Authenticated users can view scenario votes" ON scenario_votes;
DROP POLICY IF EXISTS "Authenticated users can create votes" ON scenario_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON scenario_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON scenario_votes;

ALTER TABLE scenario_votes ENABLE ROW LEVEL SECURITY;

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
  USING (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()))
  WITH CHECK (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own votes"
  ON scenario_votes FOR DELETE
  TO authenticated
  USING (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()));

-- 6. Vérifier les politiques pour scenario_documents
DROP POLICY IF EXISTS "Authenticated users can view scenario documents" ON scenario_documents;
DROP POLICY IF EXISTS "Authenticated users can upload scenario documents" ON scenario_documents;
DROP POLICY IF EXISTS "Authenticated users can delete scenario documents" ON scenario_documents;

ALTER TABLE scenario_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scenario documents"
  ON scenario_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload scenario documents"
  ON scenario_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update scenario documents"
  ON scenario_documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scenario documents"
  ON scenario_documents FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS pour scénarios réappliquées avec succès';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables mises à jour:';
  RAISE NOTICE '  - scenarios (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - scenario_results (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - scenario_votes (SELECT, INSERT, UPDATE own, DELETE own)';
  RAISE NOTICE '  - scenario_documents (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Testez maintenant la création de scénario depuis l''interface';
END $$;
