-- ============================================================
-- Migration 156 : Multi-Tenant — flag onboarding_completed sur organizations
--
-- Permet au flow Phase 4 (wizard onboarding) de savoir si un tenant a
-- complete sa configuration initiale (nom legal, devise, juridiction,
-- classes de parts, etc.).
--
-- Si false : le 1er org_admin qui se connecte est redirige vers
--            /onboarding au lieu de /dashboard.
-- Si true  : acces direct au dashboard (cas CERDIA Globale et tenants
--            deja configures).
-- ============================================================

BEGIN;

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Seed : CERDIA Globale (plan=internal) est deja configure
UPDATE organizations
   SET onboarding_completed = true
 WHERE plan = 'internal';

COMMENT ON COLUMN organizations.onboarding_completed IS
'True quand le 1er org_admin du tenant a complete le wizard de setup initial (nom legal, devise, juridiction, classes de parts).';

-- Verification
SELECT id, name, plan, onboarding_completed
  FROM organizations
 ORDER BY created_at;

COMMIT;
