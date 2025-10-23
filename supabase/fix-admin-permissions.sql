-- =====================================================
-- FIX: Donner toutes les permissions à l'utilisateur admin
-- =====================================================
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

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

-- 2. Vérifier la mise à jour
SELECT
  id,
  first_name,
  last_name,
  email,
  access_level,
  permissions,
  can_vote
FROM investors
WHERE email = 'eric.dufort@cerdia.com';

-- 3. Optionnel : Donner aussi toutes les permissions aux autres admins
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

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Permissions admin mises à jour';
  RAISE NOTICE '';
  RAISE NOTICE 'Utilisateur mis à jour:';
  RAISE NOTICE '  - eric.dufort@cerdia.com';
  RAISE NOTICE '';
  RAISE NOTICE 'Permissions accordées:';
  RAISE NOTICE '  - Dashboard: ✓';
  RAISE NOTICE '  - Projet: ✓';
  RAISE NOTICE '  - Administration: ✓';
  RAISE NOTICE '  - Droit de vote: ✓';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Reconnectez-vous sur www.cerdia.ai pour appliquer les changements';
END $$;
