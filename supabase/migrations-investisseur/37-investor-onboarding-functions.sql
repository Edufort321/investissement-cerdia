-- =====================================================
-- SCRIPT 37: FONCTIONS D'ONBOARDING INVESTISSEUR
-- =====================================================
-- Description: Fonctions pour créer automatiquement des investisseurs avec génération de mot de passe
-- Dépendances: Script 2 (table investors), Supabase Auth
-- =====================================================

-- =====================================================
-- FONCTION 1: Générer un mot de passe automatique
-- =====================================================
-- Format: [3 chiffres][1 lettre prénom][3 lettres nom][2 caractères spéciaux]
-- Exemple: 321Eduf!$

CREATE OR REPLACE FUNCTION generate_investor_password(
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_password TEXT;
  v_random_numbers TEXT;
  v_first_initial TEXT;
  v_last_initials TEXT;
  v_special_chars TEXT;
BEGIN
  -- Générer 3 chiffres aléatoires (100-999)
  v_random_numbers := (100 + floor(random() * 900))::TEXT;

  -- Prendre la première lettre du prénom (majuscule)
  v_first_initial := UPPER(SUBSTRING(p_first_name FROM 1 FOR 1));

  -- Prendre les 3 premières lettres du nom (minuscules)
  v_last_initials := LOWER(SUBSTRING(p_last_name FROM 1 FOR 3));

  -- Ajouter 2 caractères spéciaux fixes (pour simplicité)
  v_special_chars := '!$';

  -- Assembler le mot de passe
  v_password := v_random_numbers || v_first_initial || v_last_initials || v_special_chars;

  RETURN v_password;
END;
$$ LANGUAGE plpgsql;

-- Exemple d'utilisation:
-- SELECT generate_investor_password('Eric', 'Dufort');
-- Résultat possible: 721Eduf!$

-- =====================================================
-- FONCTION 2: Créer un investisseur complet
-- =====================================================
-- Cette fonction:
-- 1. Génère un mot de passe automatique
-- 2. Crée l'utilisateur dans Supabase Auth
-- 3. Crée le profil dans la table investors
-- 4. Retourne les identifiants générés

CREATE OR REPLACE FUNCTION create_investor(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_action_class TEXT DEFAULT 'B',
  p_permissions JSONB DEFAULT '{"dashboard": true, "projet": false, "administration": false, "voting": false}'::jsonb
)
RETURNS TABLE(
  investor_id UUID,
  auth_user_id UUID,
  email TEXT,
  generated_password TEXT,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_password TEXT;
  v_username TEXT;
  v_auth_user_id UUID;
  v_investor_id UUID;
BEGIN
  -- Vérifier que l'email n'existe pas déjà
  IF EXISTS (SELECT 1 FROM investors WHERE email = p_email) THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::UUID,
      p_email,
      NULL::TEXT,
      FALSE,
      'Erreur: Email déjà utilisé'::TEXT;
    RETURN;
  END IF;

  -- Générer le mot de passe
  v_password := generate_investor_password(p_first_name, p_last_name);

  -- Générer le username (prénom.nom en minuscules)
  v_username := LOWER(p_first_name || '.' || p_last_name);

  -- Créer l'utilisateur dans Supabase Auth
  -- Note: Cette partie doit être faite manuellement via l'interface Supabase ou API
  -- car les fonctions SQL n'ont pas accès direct à auth.users en écriture
  -- On va d'abord créer l'investisseur et retourner le mot de passe

  -- Créer le profil investisseur (sans user_id pour l'instant)
  INSERT INTO investors (
    first_name,
    last_name,
    email,
    username,
    action_class,
    access_level,
    permissions,
    can_vote,
    status,
    total_shares,
    share_value
  ) VALUES (
    p_first_name,
    p_last_name,
    p_email,
    v_username,
    p_action_class,
    'investisseur', -- Par défaut, pas admin
    p_permissions,
    CASE
      WHEN (p_permissions->>'voting')::BOOLEAN THEN TRUE
      ELSE FALSE
    END,
    'actif',
    0, -- Aucune part au début
    1.00 -- Valeur nominale de départ
  )
  RETURNING id INTO v_investor_id;

  -- Retourner les informations
  RETURN QUERY SELECT
    v_investor_id,
    NULL::UUID, -- user_id sera ajouté manuellement après création Auth
    p_email,
    v_password,
    TRUE,
    'Investisseur créé. Créez maintenant l''utilisateur Auth avec ce mot de passe.'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- Exemple d'utilisation:
-- SELECT * FROM create_investor(
--   'Jean',
--   'Dupont',
--   'jean.dupont@example.com',
--   'A',
--   '{"dashboard": true, "projet": true, "administration": false, "voting": true}'::jsonb
-- );

-- =====================================================
-- FONCTION 3: Lier un investisseur à un utilisateur Auth
-- =====================================================
-- À utiliser après avoir créé l'utilisateur dans Supabase Auth

CREATE OR REPLACE FUNCTION link_investor_to_auth(
  p_email TEXT,
  p_auth_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Mettre à jour l'investisseur avec le user_id
  UPDATE investors
  SET user_id = p_auth_user_id
  WHERE email = p_email;

  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Exemple d'utilisation:
-- SELECT link_investor_to_auth('jean.dupont@example.com', 'abc123-def456-...');

-- =====================================================
-- FONCTION 4: Workflow complet d'onboarding
-- =====================================================
-- Cette fonction guide à travers le processus complet

CREATE OR REPLACE FUNCTION onboard_investor_guide(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_action_class TEXT DEFAULT 'B',
  p_permissions JSONB DEFAULT '{"dashboard": true, "projet": false, "administration": false, "voting": false}'::jsonb
)
RETURNS TABLE(
  step INTEGER,
  instruction TEXT,
  details TEXT
) AS $$
DECLARE
  v_password TEXT;
  v_username TEXT;
BEGIN
  -- Générer le mot de passe pour les instructions
  v_password := generate_investor_password(p_first_name, p_last_name);
  v_username := LOWER(p_first_name || '.' || p_last_name);

  -- Retourner le guide étape par étape
  RETURN QUERY
  SELECT 1,
         'ÉTAPE 1: Créer l''investisseur dans la base'::TEXT,
         format('Exécutez: SELECT * FROM create_investor(%L, %L, %L, %L, %L::jsonb);',
                p_first_name, p_last_name, p_email, p_action_class, p_permissions::TEXT)::TEXT
  UNION ALL
  SELECT 2,
         'ÉTAPE 2: Créer l''utilisateur dans Supabase Auth'::TEXT,
         format('Allez dans Authentication → Users → Add user
Email: %s
Password: %s
Username: %s
Cochez "Auto Confirm User"
Notez le User ID généré', p_email, v_password, v_username)::TEXT
  UNION ALL
  SELECT 3,
         'ÉTAPE 3: Lier l''investisseur à l''utilisateur Auth'::TEXT,
         format('Exécutez: SELECT link_investor_to_auth(%L, ''[USER_ID]'');
Remplacez [USER_ID] par l''UUID de l''étape 2', p_email)::TEXT
  UNION ALL
  SELECT 4,
         'ÉTAPE 4: Envoyer les identifiants à l''investisseur'::TEXT,
         format('Email: %s
Mot de passe: %s
URL: https://www.cerdia.ai/connexion
L''investisseur pourra changer son mot de passe après la première connexion.',
                p_email, v_password)::TEXT
  ORDER BY step;
END;
$$ LANGUAGE plpgsql;

-- Exemple d'utilisation:
-- SELECT * FROM onboard_investor_guide('Jean', 'Dupont', 'jean.dupont@example.com', 'A', '{"dashboard": true, "projet": true}'::jsonb);

-- =====================================================
-- VUE: Investisseurs sans compte Auth (à finaliser)
-- =====================================================

CREATE OR REPLACE VIEW investors_pending_auth AS
SELECT
  id,
  first_name,
  last_name,
  email,
  username,
  action_class,
  permissions,
  created_at
FROM investors
WHERE user_id IS NULL
ORDER BY created_at DESC;

-- =====================================================
-- FONCTION 5: Générer rapport des investisseurs
-- =====================================================

CREATE OR REPLACE FUNCTION get_investors_status_report()
RETURNS TABLE(
  total_investors BIGINT,
  with_auth_account BIGINT,
  pending_auth_setup BIGINT,
  active_investors BIGINT,
  inactive_investors BIGINT,
  admin_count BIGINT,
  regular_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_investors,
    COUNT(user_id)::BIGINT as with_auth_account,
    COUNT(*) FILTER (WHERE user_id IS NULL)::BIGINT as pending_auth_setup,
    COUNT(*) FILTER (WHERE status = 'actif')::BIGINT as active_investors,
    COUNT(*) FILTER (WHERE status = 'inactif')::BIGINT as inactive_investors,
    COUNT(*) FILTER (WHERE access_level = 'admin')::BIGINT as admin_count,
    COUNT(*) FILTER (WHERE access_level = 'investisseur')::BIGINT as regular_count
  FROM investors;
END;
$$ LANGUAGE plpgsql;

-- Exemple d'utilisation:
-- SELECT * FROM get_investors_status_report();

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_investors_user_id ON investors(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_email ON investors(email);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);

-- =====================================================
-- COMMENTAIRES SUR LES FONCTIONS
-- =====================================================

COMMENT ON FUNCTION generate_investor_password IS 'Génère un mot de passe au format [3 chiffres][1 lettre prénom][3 lettres nom][2 caractères spéciaux]';
COMMENT ON FUNCTION create_investor IS 'Crée un nouvel investisseur avec génération automatique du mot de passe';
COMMENT ON FUNCTION link_investor_to_auth IS 'Lie un investisseur existant à un utilisateur Supabase Auth';
COMMENT ON FUNCTION onboard_investor_guide IS 'Retourne un guide étape par étape pour onboarder un investisseur';
COMMENT ON FUNCTION get_investors_status_report IS 'Génère un rapport du statut de tous les investisseurs';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 37: FONCTIONS D''ONBOARDING CRÉÉES';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  1. generate_investor_password(first_name, last_name)';
  RAISE NOTICE '  2. create_investor(first_name, last_name, email, action_class, permissions)';
  RAISE NOTICE '  3. link_investor_to_auth(email, auth_user_id)';
  RAISE NOTICE '  4. onboard_investor_guide(first_name, last_name, email, ...)';
  RAISE NOTICE '  5. get_investors_status_report()';
  RAISE NOTICE '';
  RAISE NOTICE 'Vue créée:';
  RAISE NOTICE '  - investors_pending_auth (liste des investisseurs sans compte Auth)';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Pour créer un nouvel investisseur:';
  RAISE NOTICE '  SELECT * FROM onboard_investor_guide(''Prénom'', ''Nom'', ''email@example.com'');';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Pour voir le rapport:';
  RAISE NOTICE '  SELECT * FROM get_investors_status_report();';
  RAISE NOTICE '';
END $$;
