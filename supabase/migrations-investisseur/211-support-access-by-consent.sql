-- Migration 211 : Accès support super_admin PAR CONSENTEMENT du tenant
-- =====================================================================
-- Remplace le bypass total super_admin (OR is_super_admin()) dans toutes les
-- policies tenant_isolation par un bypass CONDITIONNEL :
--
--   un super_admin peut accéder à une organisation SI :
--     1. c'est l'organisation CERDIA Globale (c0000000-…-0001), OU
--     2. l'organisation est une démo (is_demo = true), OU
--     3. le tenant a ACTIVÉ le consentement support (grant actif non expiré).
--
-- Conséquence : par défaut, un super_admin NE voit PLUS les données des autres
-- tenants. Il doit attendre que le tenant active « Autoriser le support CERDIA »
-- (durée choisie) dans ses paramètres. CERDIA Globale (org du staff) et DEMO
-- restent accessibles sans consentement.
--
-- Accès accordé = LECTURE + ÉCRITURE (le support peut corriger), TOUT EST AUDITÉ
-- via la table support_access_grants (qui, quand, jusqu'à quand).
-- =====================================================================

-- ── 1. Table de consentement support ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_access_grants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  granted_by       UUID,                         -- profiles.id de l'org_admin qui a activé
  reason           TEXT,                         -- motif optionnel
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,         -- fin automatique de l'accès
  revoked_at       TIMESTAMPTZ,                  -- révocation manuelle anticipée
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_grants_org_active
  ON support_access_grants (organization_id, expires_at)
  WHERE revoked_at IS NULL;

-- Un grant est ACTIF si non révoqué et non expiré.
CREATE OR REPLACE VIEW support_access_active AS
SELECT organization_id, granted_at, expires_at
FROM support_access_grants
WHERE revoked_at IS NULL AND expires_at > NOW();

-- RLS sur la table elle-même : le tenant gère ses propres grants ; super_admin voit tout.
ALTER TABLE support_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS support_grants_tenant ON support_access_grants;
CREATE POLICY support_grants_tenant ON support_access_grants
  FOR ALL TO authenticated
  USING (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid()));

-- ── 2. Fonction d'autorisation conditionnée au consentement ──────────────
CREATE OR REPLACE FUNCTION public.super_admin_can_access(p_org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    -- Doit être super_admin d'abord
    public.is_super_admin(auth.uid())
    AND (
      -- a) CERDIA Globale (org du staff) — accès permanent
      p_org = 'c0000000-0000-0000-0000-000000000001'::uuid
      -- b) toute organisation de démonstration — accès permanent
      OR EXISTS (SELECT 1 FROM organizations o WHERE o.id = p_org AND o.is_demo = true)
      -- c) tenant ayant activé le consentement support (grant actif)
      OR EXISTS (
        SELECT 1 FROM support_access_grants g
        WHERE g.organization_id = p_org
          AND g.revoked_at IS NULL
          AND g.expires_at > NOW()
      )
    )
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_can_access(UUID) TO authenticated;

COMMENT ON FUNCTION public.super_admin_can_access(UUID) IS
'True si le super_admin courant peut accéder à l''org : CERDIA Globale + démos en permanence, autres tenants seulement si consentement support actif.';

-- ── 3. Recâble TOUTES les policies tenant_isolation existantes ───────────
-- Remplace « organization_id = auth_get_org_id() OR is_super_admin() » par
-- « organization_id = auth_get_org_id() OR super_admin_can_access(organization_id) ».
DO $$
DECLARE
  rec       RECORD;
  converted INT := 0;
BEGIN
  FOR rec IN
    SELECT DISTINCT tablename
      FROM pg_policies
     WHERE schemaname = 'public' AND policyname = 'tenant_isolation'
     ORDER BY tablename
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', rec.tablename);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (organization_id = public.auth_get_org_id() OR public.super_admin_can_access(organization_id)) '
      'WITH CHECK (organization_id = public.auth_get_org_id() OR public.super_admin_can_access(organization_id))',
      rec.tablename
    );
    converted := converted + 1;
    RAISE NOTICE '[211] tenant_isolation recable (consentement) sur %', rec.tablename;
  END LOOP;
  RAISE NOTICE '[211] === % policies tenant_isolation recablees ===', converted;
END $$;

-- ── 4. Vérification ──────────────────────────────────────────────────────
SELECT
  COUNT(*) AS policies_consentement
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'tenant_isolation'
  AND qual LIKE '%super_admin_can_access%';
