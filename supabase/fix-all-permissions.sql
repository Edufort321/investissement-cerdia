-- =====================================================
-- FIX COMPLET: Permissions Admin + Politiques RLS
-- =====================================================
-- À exécuter dans Supabase Dashboard → SQL Editor
-- Ce script combine les deux corrections nécessaires
-- =====================================================

-- =================================================
-- PARTIE 1: DONNER TOUTES LES PERMISSIONS À L'ADMIN
-- =================================================

-- 1. Mettre à jour les permissions pour eric.dufort@cerdia.com
UPDATE investors
SET
  access_level = 'admin',
  permissions = '{
    "dashboard": true,
    "projet": true,
    "administration": true,
    "voting": true
  }'::jsonb,
  can_vote = true
WHERE email = 'eric.dufort@cerdia.com';

-- 2. Optionnel : Mettre à jour tous les admins
UPDATE investors
SET
  permissions = '{
    "dashboard": true,
    "projet": true,
    "administration": true,
    "voting": true
  }'::jsonb,
  can_vote = true
WHERE access_level = 'admin';

-- =================================================
-- PARTIE 2: CORRIGER LES POLITIQUES RLS DES SCÉNARIOS
-- =================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Authenticated users can view scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can create scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can delete scenarios" ON scenarios;

-- Activer RLS
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- Recréer les politiques avec permissions complètes
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

-- =================================================
-- PARTIE 3: CORRIGER LES AUTRES TABLES DE SCÉNARIOS
-- =================================================

-- scenario_results
DROP POLICY IF EXISTS "Authenticated users can view scenario results" ON scenario_results;
DROP POLICY IF EXISTS "Authenticated users can create scenario results" ON scenario_results;
DROP POLICY IF EXISTS "Authenticated users can update scenario results" ON scenario_results;
DROP POLICY IF EXISTS "Authenticated users can delete scenario results" ON scenario_results;

ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scenario results"
  ON scenario_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create scenario results"
  ON scenario_results FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update scenario results"
  ON scenario_results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scenario results"
  ON scenario_results FOR DELETE TO authenticated USING (true);

-- scenario_votes
DROP POLICY IF EXISTS "Authenticated users can view scenario votes" ON scenario_votes;
DROP POLICY IF EXISTS "Authenticated users can create votes" ON scenario_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON scenario_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON scenario_votes;

ALTER TABLE scenario_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scenario votes"
  ON scenario_votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create votes"
  ON scenario_votes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own votes"
  ON scenario_votes FOR UPDATE TO authenticated
  USING (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()))
  WITH CHECK (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own votes"
  ON scenario_votes FOR DELETE TO authenticated
  USING (investor_id = (SELECT id FROM investors WHERE user_id = auth.uid()));

-- scenario_documents
DROP POLICY IF EXISTS "Authenticated users can view scenario documents" ON scenario_documents;
DROP POLICY IF EXISTS "Authenticated users can upload scenario documents" ON scenario_documents;
DROP POLICY IF EXISTS "Authenticated users can update scenario documents" ON scenario_documents;
DROP POLICY IF EXISTS "Authenticated users can delete scenario documents" ON scenario_documents;

ALTER TABLE scenario_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scenario documents"
  ON scenario_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upload scenario documents"
  ON scenario_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update scenario documents"
  ON scenario_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scenario documents"
  ON scenario_documents FOR DELETE TO authenticated USING (true);

-- =================================================
-- VÉRIFICATION FINALE
-- =================================================

SELECT
  email,
  first_name,
  last_name,
  access_level,
  permissions,
  can_vote
FROM investors
WHERE email = 'eric.dufort@cerdia.com';

-- =================================================
-- MESSAGE DE CONFIRMATION
-- =================================================

DO $$
BEGIN
  RAISE NOTICE '✅ CORRECTION COMPLÈTE DES PERMISSIONS';
  RAISE NOTICE '';
  RAISE NOTICE 'PARTIE 1: Permissions Utilisateur';
  RAISE NOTICE '  - eric.dufort@cerdia.com: access_level = admin';
  RAISE NOTICE '  - Permissions: dashboard ✓, projet ✓, administration ✓, voting ✓';
  RAISE NOTICE '';
  RAISE NOTICE 'PARTIE 2: Politiques RLS';
  RAISE NOTICE '  - scenarios: SELECT ✓, INSERT ✓, UPDATE ✓, DELETE ✓';
  RAISE NOTICE '  - scenario_results: SELECT ✓, INSERT ✓, UPDATE ✓, DELETE ✓';
  RAISE NOTICE '  - scenario_votes: SELECT ✓, INSERT ✓, UPDATE own ✓, DELETE own ✓';
  RAISE NOTICE '  - scenario_documents: SELECT ✓, INSERT ✓, UPDATE ✓, DELETE ✓';
  RAISE NOTICE '';
  RAISE NOTICE '📌 IMPORTANT: Reconnectez-vous sur www.cerdia.ai pour appliquer les changements';
  RAISE NOTICE '📌 Videz le cache: localStorage.clear() puis location.reload()';
END $$;
