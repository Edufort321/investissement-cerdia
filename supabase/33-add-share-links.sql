-- =====================================================
-- SCRIPT 33: SYSTÈME DE PARTAGE VIA HYPERLIEN
-- =====================================================
-- Description: Table et fonctions pour partager des
--              scénarios/projets via liens sécurisés
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- =====================================================
-- TABLE: LIENS DE PARTAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{"view_financials": true, "view_documents": false, "view_bookings": false}'::jsonb,
  notes TEXT
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_scenario ON share_links(scenario_id);
CREATE INDEX IF NOT EXISTS idx_share_links_active ON share_links(is_active) WHERE is_active = TRUE;

-- Commentaires
COMMENT ON TABLE share_links IS 'Liens de partage sécurisés pour les scénarios/projets';
COMMENT ON COLUMN share_links.token IS 'Token unique et sécurisé pour l''accès public';
COMMENT ON COLUMN share_links.permissions IS 'Permissions: view_financials, view_documents, view_bookings';
COMMENT ON COLUMN share_links.expires_at IS 'Date d''expiration du lien (NULL = jamais)';
COMMENT ON COLUMN share_links.is_active IS 'Lien actif ou révoqué';

-- =====================================================
-- FONCTION: GÉNÉRER UN TOKEN SÉCURISÉ
-- =====================================================
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(64) AS $$
DECLARE
  v_token VARCHAR(64);
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Générer un token aléatoire de 64 caractères
    v_token := encode(gen_random_bytes(32), 'hex');

    -- Vérifier s'il existe déjà
    SELECT EXISTS(SELECT 1 FROM share_links WHERE token = v_token) INTO v_exists;

    -- Si unique, sortir de la boucle
    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: CRÉER UN LIEN DE PARTAGE
-- =====================================================
CREATE OR REPLACE FUNCTION create_share_link(
  p_scenario_id UUID,
  p_created_by UUID,
  p_expires_in_days INTEGER DEFAULT NULL,
  p_view_financials BOOLEAN DEFAULT TRUE,
  p_view_documents BOOLEAN DEFAULT FALSE,
  p_view_bookings BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  token VARCHAR(64),
  share_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_token VARCHAR(64);
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_link_id UUID;
BEGIN
  -- Générer un token unique
  v_token := generate_share_token();

  -- Calculer la date d'expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;

  -- Insérer le lien
  INSERT INTO share_links (
    token,
    scenario_id,
    created_by,
    expires_at,
    permissions,
    notes
  )
  VALUES (
    v_token,
    p_scenario_id,
    p_created_by,
    v_expires_at,
    jsonb_build_object(
      'view_financials', p_view_financials,
      'view_documents', p_view_documents,
      'view_bookings', p_view_bookings
    ),
    p_notes
  )
  RETURNING share_links.id INTO v_link_id;

  -- Retourner les informations du lien
  RETURN QUERY
  SELECT
    v_link_id,
    v_token,
    '/share/' || v_token AS share_url,
    v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: VALIDER ET RÉCUPÉRER UN LIEN
-- =====================================================
CREATE OR REPLACE FUNCTION get_share_link_data(
  p_token VARCHAR(64)
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  scenario_id UUID,
  scenario_data JSONB,
  permissions JSONB,
  access_count INTEGER
) AS $$
DECLARE
  v_link RECORD;
  v_scenario JSONB;
BEGIN
  -- Récupérer le lien
  SELECT * INTO v_link
  FROM share_links
  WHERE token = p_token;

  -- Vérifier si le lien existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Lien invalide ou inexistant'::TEXT, NULL::UUID, NULL::JSONB, NULL::JSONB, 0;
    RETURN;
  END IF;

  -- Vérifier si le lien est actif
  IF NOT v_link.is_active THEN
    RETURN QUERY SELECT FALSE, 'Lien désactivé'::TEXT, NULL::UUID, NULL::JSONB, NULL::JSONB, 0;
    RETURN;
  END IF;

  -- Vérifier l'expiration
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Lien expiré'::TEXT, NULL::UUID, NULL::JSONB, NULL::JSONB, 0;
    RETURN;
  END IF;

  -- Incrémenter le compteur d'accès
  UPDATE share_links
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE token = p_token;

  -- Récupérer les données du scénario
  SELECT to_jsonb(s.*) INTO v_scenario
  FROM scenarios s
  WHERE s.id = v_link.scenario_id;

  -- Retourner les données
  RETURN QUERY SELECT
    TRUE,
    NULL::TEXT,
    v_link.scenario_id,
    v_scenario,
    v_link.permissions,
    v_link.access_count + 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: RÉVOQUER UN LIEN
-- =====================================================
CREATE OR REPLACE FUNCTION revoke_share_link(
  p_link_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE share_links
  SET is_active = FALSE
  WHERE id = p_link_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FONCTION: LISTER LES LIENS D'UN SCÉNARIO
-- =====================================================
CREATE OR REPLACE FUNCTION list_scenario_share_links(
  p_scenario_id UUID
)
RETURNS TABLE (
  id UUID,
  token VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  access_count INTEGER,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  permissions JSONB,
  notes TEXT,
  share_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.token,
    sl.created_at,
    sl.expires_at,
    sl.is_active,
    sl.access_count,
    sl.last_accessed_at,
    sl.permissions,
    sl.notes,
    '/share/' || sl.token AS share_url
  FROM share_links sl
  WHERE sl.scenario_id = p_scenario_id
  ORDER BY sl.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VUE: RÉSUMÉ DES LIENS ACTIFS
-- =====================================================
CREATE OR REPLACE VIEW active_share_links AS
SELECT
  sl.id,
  sl.token,
  s.name as scenario_name,
  s.status as scenario_status,
  sl.created_at,
  sl.expires_at,
  sl.access_count,
  sl.last_accessed_at,
  sl.is_active,
  sl.permissions,
  '/share/' || sl.token AS share_url,
  CASE
    WHEN sl.expires_at IS NULL THEN 'Permanent'
    WHEN sl.expires_at > NOW() THEN 'Actif'
    ELSE 'Expiré'
  END as status
FROM share_links sl
JOIN scenarios s ON sl.scenario_id = s.id
WHERE sl.is_active = TRUE
ORDER BY sl.created_at DESC;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 33: SYSTÈME DE PARTAGE VIA HYPERLIEN CRÉÉ';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Table créée:';
  RAISE NOTICE '  - share_links: Stockage des liens de partage';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - generate_share_token(): Génère un token unique';
  RAISE NOTICE '  - create_share_link(): Crée un nouveau lien de partage';
  RAISE NOTICE '  - get_share_link_data(): Valide et récupère les données';
  RAISE NOTICE '  - revoke_share_link(): Désactive un lien';
  RAISE NOTICE '  - list_scenario_share_links(): Liste les liens d''un scénario';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - active_share_links: Vue des liens actifs';
  RAISE NOTICE ' ';
  RAISE NOTICE '✓ Système de partage sécurisé prêt!';
END $$;
