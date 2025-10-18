-- ========================================
-- SCRIPT DE CORRECTION AUTHENTIFICATION
-- Pour: Éric Dufort
-- ========================================

-- ÉTAPE 1: Vérifier si l'utilisateur Auth existe déjà
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'eric.dufort@cerdia.com';

-- Si l'utilisateur existe, copie son UUID et passe à l'ÉTAPE 3
-- Si l'utilisateur n'existe PAS, continue avec l'ÉTAPE 2

-- ========================================
-- ÉTAPE 2: Créer l'utilisateur Auth
-- ========================================
-- ⚠️ DÉCOMMENTE CETTE SECTION SI L'UTILISATEUR N'EXISTE PAS

/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  email_change_confirm_status,
  confirmation_sent_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), -- Supabase génère automatiquement
  'authenticated',
  'authenticated',
  'eric.dufort@cerdia.com',
  crypt('321Eduf!$', gen_salt('bf')), -- Hash du mot de passe
  NOW(), -- Email confirmé immédiatement
  0,
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Éric","last_name":"Dufort"}',
  false,
  '',
  ''
)
RETURNING id, email;
-- ⚠️ COPIE L'UUID RETOURNÉ!
*/

-- ========================================
-- ÉTAPE 3: Vérifier l'investisseur dans la table investors
-- ========================================
SELECT id, user_id, first_name, last_name, email, status
FROM investors
WHERE email = 'eric.dufort@cerdia.com';

-- Si user_id est NULL ou incorrect, passe à l'ÉTAPE 4

-- ========================================
-- ÉTAPE 4: Lier l'utilisateur Auth à l'investisseur
-- ========================================
-- ⚠️ REMPLACE 'UUID_FROM_AUTH_USERS' par l'UUID obtenu à l'ÉTAPE 1 ou 2

/*
UPDATE investors
SET user_id = 'UUID_FROM_AUTH_USERS' -- Remplace par le vrai UUID
WHERE email = 'eric.dufort@cerdia.com';
*/

-- ========================================
-- ÉTAPE 5: Vérification finale
-- ========================================
-- Cette requête doit retourner une ligne avec toutes les infos

SELECT
  i.id as investor_id,
  i.first_name,
  i.last_name,
  i.email,
  i.status as investor_status,
  i.user_id,
  u.id as auth_user_id,
  u.email as auth_email,
  u.email_confirmed_at,
  CASE
    WHEN i.user_id = u.id THEN '✅ LIEN CORRECT'
    ELSE '❌ LIEN INCORRECT'
  END as verification
FROM investors i
LEFT JOIN auth.users u ON i.user_id = u.id
WHERE i.email = 'eric.dufort@cerdia.com';

-- ========================================
-- RÉSULTAT ATTENDU:
-- ========================================
-- ✅ verification = '✅ LIEN CORRECT'
-- ✅ auth_email = 'eric.dufort@cerdia.com'
-- ✅ email_confirmed_at est rempli (pas NULL)
-- ✅ investor_status = 'actif'

-- ========================================
-- TEST DE CONNEXION
-- ========================================
-- Après avoir exécuté ce script:
-- 1. Va sur http://localhost:3000/connexion
-- 2. Tape "Eric" dans le champ de recherche
-- 3. Sélectionne "Éric Dufort" dans la liste
-- 4. Entre le mot de passe: 321Eduf!$
-- 5. Clique "Se connecter"
--
-- ✅ Tu devrais être redirigé vers /dashboard avec tes données

-- ========================================
-- EN CAS DE PROBLÈME
-- ========================================
-- Si la connexion ne fonctionne toujours pas:
--
-- 1. Vérifier les logs dans Supabase Dashboard > Logs
-- 2. Vérifier les politiques RLS:

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'investors';

-- 3. Tester la connexion directement:
-- Dans Supabase Dashboard > Authentication > Users
-- Clique sur l'utilisateur eric.dufort@cerdia.com
-- Utilise "Send magic link" pour tester
