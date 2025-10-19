-- ==========================================
-- DIAGNOSTIC COMPLET FINAL
-- ==========================================

-- Étape 1: Vérifier l'utilisateur dans auth.users
SELECT
  '1️⃣ AUTH.USERS' as etape,
  id,
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as "A un mot de passe?",
  created_at
FROM auth.users
WHERE email = 'eric.dufort@cerdia.com';

-- Si cette requête ne retourne RIEN, l'utilisateur n'existe pas dans auth.users

-- Étape 2: Vérifier l'investisseur
SELECT
  '2️⃣ INVESTORS' as etape,
  id,
  first_name,
  last_name,
  email,
  user_id,
  status
FROM investors
WHERE email = 'eric.dufort@cerdia.com';

-- Étape 3: Vérifier le lien
SELECT
  '3️⃣ CORRESPONDANCE' as etape,
  i.email as email_investisseur,
  i.user_id as user_id_dans_investors,
  u.id as id_dans_auth_users,
  u.email as email_dans_auth,
  CASE
    WHEN u.id IS NULL THEN '❌ Utilisateur Auth n''existe pas'
    WHEN i.user_id IS NULL THEN '❌ user_id NULL dans investors'
    WHEN i.user_id != u.id THEN '❌ UUID ne correspondent pas'
    WHEN u.email_confirmed_at IS NULL THEN '❌ Email non confirmé'
    ELSE '✅ TOUT EST CORRECT'
  END as diagnostic
FROM investors i
LEFT JOIN auth.users u ON i.user_id = u.id
WHERE i.email = 'eric.dufort@cerdia.com';

-- Étape 4: Si l'utilisateur Auth n'existe pas, afficher les instructions
DO $$
DECLARE
  user_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'eric.dufort@cerdia.com') INTO user_exists;

  IF NOT user_exists THEN
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '❌ L''UTILISATEUR N''EXISTE PAS DANS AUTH.USERS';
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SOLUTION:';
    RAISE NOTICE '1. Va dans Authentication > Users dans le menu de gauche';
    RAISE NOTICE '2. Clique "Add user" > "Create new user"';
    RAISE NOTICE '3. Email: eric.dufort@cerdia.com';
    RAISE NOTICE '4. Password: 321Eduf!$';
    RAISE NOTICE '5. ✅ COCHE "Auto Confirm User"';
    RAISE NOTICE '6. Clique "Create user"';
    RAISE NOTICE '7. COPIE l''UUID généré';
    RAISE NOTICE '';
    RAISE NOTICE '8. Ensuite, exécute ce script pour lier:';
    RAISE NOTICE 'UPDATE investors';
    RAISE NOTICE 'SET user_id = ''UUID_COPIÉ''';
    RAISE NOTICE 'WHERE email = ''eric.dufort@cerdia.com'';';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ L''utilisateur existe dans auth.users';
  END IF;
END $$;
