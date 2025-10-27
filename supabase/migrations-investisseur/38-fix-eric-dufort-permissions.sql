-- =====================================================
-- SCRIPT 38: CORRECTION PERMISSIONS ERIC DUFORT
-- =====================================================
-- Description: Donne toutes les permissions à eric.dufort@cerdia.ai
-- Dépendances: Script 2 (table investors), Script 20 (scenarios), Script 37 (fonctions)
-- =====================================================

-- =====================================================
-- ÉTAPE 1: Vérifier et afficher les utilisateurs existants
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 ÉTAT ACTUEL DES INVESTISSEURS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

-- Afficher tous les investisseurs pour diagnostic
SELECT
  id,
  first_name,
  last_name,
  email,
  username,
  access_level,
  permissions,
  can_vote,
  user_id,
  status
FROM investors
ORDER BY created_at;

-- =====================================================
-- ÉTAPE 2: Mettre à jour eric.dufort@cerdia.ai
-- =====================================================

-- Mise à jour complète avec toutes les permissions
UPDATE investors
SET
  access_level = 'admin',
  permissions = '{
    "dashboard": true,
    "projet": true,
    "administration": true,
    "voting": true
  }'::jsonb,
  can_vote = true,
  status = 'actif'
WHERE email = 'eric.dufort@cerdia.ai';

-- Vérifier la mise à jour
SELECT
  'Mise à jour de eric.dufort@cerdia.ai' as action,
  first_name,
  last_name,
  email,
  access_level,
  permissions,
  can_vote,
  status,
  CASE
    WHEN user_id IS NOT NULL THEN 'Lié à Auth ✓'
    ELSE 'PAS ENCORE LIÉ À AUTH ⚠️'
  END as auth_status
FROM investors
WHERE email = 'eric.dufort@cerdia.ai';

-- =====================================================
-- ÉTAPE 3: Corriger les politiques RLS pour SCENARIOS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🔒 CORRECTION DES POLITIQUES RLS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

-- Supprimer les anciennes politiques scenarios
DROP POLICY IF EXISTS "Authenticated users can view scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can create scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can update scenarios" ON scenarios;
DROP POLICY IF EXISTS "Authenticated users can delete scenarios" ON scenarios;

-- Vérifier que RLS est activé
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

-- =====================================================
-- ÉTAPE 4: Corriger scenario_results
-- =====================================================

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

-- =====================================================
-- ÉTAPE 5: Corriger scenario_votes
-- =====================================================

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

-- =====================================================
-- ÉTAPE 6: Corriger scenario_documents
-- =====================================================

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

-- =====================================================
-- ÉTAPE 7: Vérification finale et rapport
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 RAPPORT FINAL';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

-- Rapport des investisseurs
SELECT * FROM get_investors_status_report();

-- Détails eric.dufort@cerdia.ai
SELECT
  '✅ eric.dufort@cerdia.ai' as utilisateur,
  access_level,
  permissions,
  can_vote,
  CASE
    WHEN user_id IS NOT NULL THEN 'Lié à Auth ✓'
    ELSE '⚠️ PAS ENCORE LIÉ - Voir instructions ci-dessous'
  END as auth_status
FROM investors
WHERE email = 'eric.dufort@cerdia.ai';

-- =====================================================
-- MESSAGE DE CONFIRMATION ET INSTRUCTIONS
-- =====================================================

DO $$
DECLARE
  v_has_user_id BOOLEAN;
BEGIN
  -- Vérifier si eric.dufort a un user_id
  SELECT (user_id IS NOT NULL) INTO v_has_user_id
  FROM investors
  WHERE email = 'eric.dufort@cerdia.ai';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ SCRIPT 38: CORRECTION COMPLÈTE';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Utilisateur: eric.dufort@cerdia.ai';
  RAISE NOTICE '';
  RAISE NOTICE 'Permissions accordées:';
  RAISE NOTICE '  ✓ access_level: admin';
  RAISE NOTICE '  ✓ Dashboard: true';
  RAISE NOTICE '  ✓ Projet: true';
  RAISE NOTICE '  ✓ Administration: true';
  RAISE NOTICE '  ✓ Droit de vote: true';
  RAISE NOTICE '';
  RAISE NOTICE 'Politiques RLS mises à jour:';
  RAISE NOTICE '  ✓ scenarios (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  ✓ scenario_results (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  ✓ scenario_votes (SELECT, INSERT, UPDATE, DELETE own)';
  RAISE NOTICE '  ✓ scenario_documents (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '';

  IF NOT v_has_user_id THEN
    RAISE NOTICE '============================================';
    RAISE NOTICE '⚠️  ACTION REQUISE: LIER À SUPABASE AUTH';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'L''investisseur eric.dufort@cerdia.ai n''est pas encore';
    RAISE NOTICE 'lié à un compte Supabase Auth.';
    RAISE NOTICE '';
    RAISE NOTICE 'OPTIONS:';
    RAISE NOTICE '';
    RAISE NOTICE 'OPTION 1: Si le compte Auth existe déjà';
    RAISE NOTICE '  1. Allez dans Authentication → Users';
    RAISE NOTICE '  2. Trouvez l''utilisateur eric.dufort@cerdia.ai';
    RAISE NOTICE '  3. Copiez son User ID (UUID)';
    RAISE NOTICE '  4. Exécutez:';
    RAISE NOTICE '     SELECT link_investor_to_auth(''eric.dufort@cerdia.ai'', ''[USER_ID]'');';
    RAISE NOTICE '';
    RAISE NOTICE 'OPTION 2: Si le compte Auth n''existe PAS encore';
    RAISE NOTICE '  1. Allez dans Authentication → Users → Add user';
    RAISE NOTICE '  2. Email: eric.dufort@cerdia.ai';
    RAISE NOTICE '  3. Password: [Votre mot de passe]';
    RAISE NOTICE '  4. Cochez "Auto Confirm User"';
    RAISE NOTICE '  5. Créez l''utilisateur et notez le User ID';
    RAISE NOTICE '  6. Exécutez:';
    RAISE NOTICE '     SELECT link_investor_to_auth(''eric.dufort@cerdia.ai'', ''[USER_ID]'');';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ CONFIGURATION COMPLÈTE';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'eric.dufort@cerdia.ai est déjà lié à Supabase Auth.';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE '📌 PROCHAINES ÉTAPES';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Allez sur www.cerdia.ai';
  RAISE NOTICE '2. Ouvrez la console (F12)';
  RAISE NOTICE '3. Tapez: localStorage.clear()';
  RAISE NOTICE '4. Tapez: location.reload()';
  RAISE NOTICE '5. Reconnectez-vous avec eric.dufort@cerdia.ai';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Vous aurez maintenant accès à:';
  RAISE NOTICE '   - Dashboard ✓';
  RAISE NOTICE '   - Projet ✓';
  RAISE NOTICE '   - Évaluateur ✓';
  RAISE NOTICE '   - Scénarios (création, modification, vote) ✓';
  RAISE NOTICE '   - Administration ✓';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;
