-- ============================================================
-- Migration 145 : Fondations Multi-Tenant
--
-- Cree :
--   1. Table `organizations` (tenant principal)
--   2. Seed du tenant CERDIA Globale avec UUID deterministe
--   3. profiles.organization_id (NOT NULL apres backfill)
--   4. profiles.onboarding_completed (true pour les users existants)
--   5. Renommage des roles vers le schema multi-tenant
--   6. Helpers auth_get_org_id(), is_super_admin()
--   7. Mise a jour de is_cerdia_admin() pour utiliser les nouveaux roles
--   8. RLS sur organizations
--
-- ⚠ NON-DESTRUCTIF : aucune table existante n'est purgee.
-- ⚠ Wrappee dans BEGIN/COMMIT : si une etape echoue, tout est rollback.
-- ⚠ Backup de profiles.role dans profiles_role_backup_145 avant rename.
-- ============================================================

BEGIN;

-- ── 0. Backup defensif de profiles.role avant tout changement ─
DROP TABLE IF EXISTS profiles_role_backup_145;
CREATE TABLE profiles_role_backup_145 AS
SELECT id, role, created_at, NOW() AS backed_up_at
FROM profiles;

COMMENT ON TABLE profiles_role_backup_145 IS
'Backup des roles de profiles avant le renommage de la migration 145. Permet de restaurer si necessaire.';


-- ── 1. Table organizations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT        NOT NULL,
    slug                TEXT        UNIQUE,
    logo_url            TEXT,
    settings            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    features            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    plan                TEXT        NOT NULL DEFAULT 'basic'
                                    CHECK (plan IN ('basic','pro','enterprise','demo','internal')),
    status              TEXT        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','suspended','archived')),
    is_demo             BOOLEAN     NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug   ON organizations (slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations (status);

COMMENT ON TABLE organizations IS
'Tenants SaaS de la plateforme CERDIA. Chaque organization a ses propres donnees isolees via organization_id + RLS sur toutes les tables de domaine.';

COMMENT ON COLUMN organizations.settings IS
'Config par tenant : devises activees, classes de parts, juridiction fiscale, modules actives, etc.';

COMMENT ON COLUMN organizations.features IS
'Feature flags par tenant pour release graduelle (ex: {"beta_xyz": true}).';

COMMENT ON COLUMN organizations.plan IS
'basic | pro | enterprise | demo | internal. internal = CERDIA Globale. demo = tenant de demonstration.';


-- Trigger updated_at
CREATE OR REPLACE FUNCTION touch_organizations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION touch_organizations_updated_at();


-- ── 2. Seed : CERDIA Globale en tenant interne ──────────────────
-- UUID deterministe pour pouvoir le referencer facilement dans les
-- migrations suivantes (146+) sans avoir a faire de SELECT.
INSERT INTO organizations (id, name, slug, plan, status, settings)
VALUES (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'CERDIA Globale',
    'cerdia-globale',
    'internal',
    'active',
    jsonb_build_object(
        'currency_primary', 'CAD',
        'currencies_enabled', jsonb_build_array('CAD','USD','DOP','EUR'),
        'tax_jurisdiction', 'CA',
        'tax_forms', jsonb_build_array('T1135','T2209'),
        'share_classes', jsonb_build_array('A','B','C'),
        'modules', jsonb_build_object(
            'investment', true,
            'commerce',   true,
            'gmail',      true,
            'amazon',     true
        )
    )
)
ON CONFLICT (id) DO NOTHING;


-- ── 3. profiles.organization_id (NULL d'abord, NOT NULL apres backfill) ─
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS organization_id UUID NULL;

-- Backfill : tous les profils existants appartiennent a CERDIA Globale.
UPDATE profiles
   SET organization_id = 'c0000000-0000-0000-0000-000000000001'::uuid
 WHERE organization_id IS NULL;

-- Verification : aucun profile sans org avant NOT NULL
DO $$
DECLARE n INT;
BEGIN
    SELECT COUNT(*) INTO n FROM profiles WHERE organization_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'Backfill incomplet : % profiles sans organization_id', n;
    END IF;
END $$;

ALTER TABLE profiles
    ALTER COLUMN organization_id SET NOT NULL;

-- FK + index
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'fk_profiles_organization'
    ) THEN
        ALTER TABLE profiles
            ADD CONSTRAINT fk_profiles_organization
            FOREIGN KEY (organization_id)
            REFERENCES organizations(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles (organization_id);


-- ── 4. profiles.onboarding_completed ────────────────────────
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Les profiles existants ont deja une plateforme configuree → onboarding skip
UPDATE profiles SET onboarding_completed = true;


-- ── 5. Renommage des roles vers le schema multi-tenant ──────
-- Drop l'ancienne CHECK constraint (le nom auto-genere par Postgres
-- est generalement profiles_role_check, on le drop avec IF EXISTS).
DO $$
DECLARE constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE cls.relname = 'profiles'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%';
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Renomme les valeurs existantes (mapping 1-pour-1, reversible via backup).
UPDATE profiles SET role = 'super_admin'  WHERE role = 'owner';
UPDATE profiles SET role = 'org_admin'    WHERE role = 'admin';
UPDATE profiles SET role = 'org_investor' WHERE role = 'investor';
UPDATE profiles SET role = 'org_viewer'   WHERE role = 'viewer';

-- Nouvelle CHECK constraint avec le schema multi-tenant.
ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin','org_admin','org_investor','org_viewer','org_user'));

-- Default value du role pour les nouveaux profiles auto-crees
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'org_investor';


-- ── 6. Helpers auth multi-tenant ────────────────────────────

-- Retourne l'organization_id du user authentifie
CREATE OR REPLACE FUNCTION public.auth_get_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.auth_get_org_id() TO authenticated;

COMMENT ON FUNCTION public.auth_get_org_id() IS
'Retourne l''UUID de l''organisation du user authentifie. Utilise dans les RLS de toutes les tables de domaine pour filtrer par tenant.';

-- Retourne true si le user est super_admin (Eric, cross-org)
CREATE OR REPLACE FUNCTION public.is_super_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
         WHERE id = uid
           AND role = 'super_admin'
    )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_super_admin(UUID) IS
'True si le user a le role super_admin (Eric / staff CERDIA). Bypass RLS multi-tenant pour le support technique.';

-- Retourne true si le user est admin de son org (ou super_admin)
CREATE OR REPLACE FUNCTION public.is_org_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
         WHERE id = uid
           AND role IN ('super_admin','org_admin')
    )
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated;


-- ── 7. Mise a jour de is_cerdia_admin() pour compat ──────────
-- Continue de retourner true pour Eric (super_admin) + org_admin de
-- CERDIA Globale, ce qui maintient toutes les RLS existantes (mig 142)
-- fonctionnelles sans changement.
CREATE OR REPLACE FUNCTION public.is_cerdia_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
         WHERE id = uid
           AND role IN ('super_admin','org_admin')
           AND organization_id = 'c0000000-0000-0000-0000-000000000001'::uuid
    )
$$;

COMMENT ON FUNCTION public.is_cerdia_admin(UUID) IS
'Compat post-mig 145 : true si super_admin ou org_admin de CERDIA Globale. Sera deprecie quand toutes les RLS auront migre vers auth_get_org_id()+is_super_admin().';


-- ── 8. RLS sur organizations ────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Le user peut lire SA propre organization
DROP POLICY IF EXISTS "self_read_own_org" ON organizations;
CREATE POLICY "self_read_own_org" ON organizations
    FOR SELECT TO authenticated
    USING (id = public.auth_get_org_id());

-- super_admin peut tout lire/ecrire (cross-org pour creation tenant + support)
DROP POLICY IF EXISTS "super_admin_all_orgs" ON organizations;
CREATE POLICY "super_admin_all_orgs" ON organizations
    FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));


-- ── 9. Verification finale ──────────────────────────────────
SELECT 'orgs total'                  AS metric, COUNT(*)::TEXT  AS value FROM organizations
UNION ALL
SELECT 'profiles total',                       COUNT(*)::TEXT          FROM profiles
UNION ALL
SELECT 'profiles sans org_id (doit etre 0)',   COUNT(*)::TEXT          FROM profiles WHERE organization_id IS NULL
UNION ALL
SELECT 'role super_admin',                     COUNT(*)::TEXT          FROM profiles WHERE role = 'super_admin'
UNION ALL
SELECT 'role org_admin',                       COUNT(*)::TEXT          FROM profiles WHERE role = 'org_admin'
UNION ALL
SELECT 'role org_investor',                    COUNT(*)::TEXT          FROM profiles WHERE role = 'org_investor'
UNION ALL
SELECT 'role org_viewer',                      COUNT(*)::TEXT          FROM profiles WHERE role = 'org_viewer'
UNION ALL
SELECT 'role backup rows',                     COUNT(*)::TEXT          FROM profiles_role_backup_145
UNION ALL
SELECT 'Eric is super_admin (doit etre true)', public.is_super_admin(
    (SELECT id FROM auth.users WHERE email = 'eric.dufort@cerdia.ai' LIMIT 1)
)::TEXT
UNION ALL
SELECT 'Eric is_cerdia_admin (doit etre true)', public.is_cerdia_admin(
    (SELECT id FROM auth.users WHERE email = 'eric.dufort@cerdia.ai' LIMIT 1)
)::TEXT;

COMMIT;
