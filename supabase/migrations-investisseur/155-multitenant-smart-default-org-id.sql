-- ============================================================
-- Migration 155 : Multi-Tenant — DEFAULT organization_id intelligent
--
-- Bug : mig 146/148/149 ont ajoute organization_id NOT NULL DEFAULT
--       'c0000000-0000-0000-0000-000000000001' (CERDIA Globale UUID)
--       sur toutes les tables tenant-scoped.
--
--       Quand un nouveau tenant admin INSERT une row sans passer
--       explicitement organization_id, le DEFAULT met CERDIA UUID.
--       La policy RESTRICTIVE tenant_isolation a un WITH CHECK qui
--       verifie organization_id = auth_get_org_id() OR is_super_admin().
--       Pour le nouveau tenant : auth_get_org_id() = leur UUID, et
--       is_super_admin() = false → WITH CHECK echoue → INSERT bloque.
--
-- Symptome : "new row violates row-level security policy
-- tenant_isolation for table investors" quand le nouveau tenant
-- essaie de creer un investisseur.
--
-- Fix : nouvelle fonction default_org_id() qui retourne :
--   - auth_get_org_id() si user authentifie (= leur tenant)
--   - CERDIA UUID en fallback (anon, service_role pour les sync scripts)
--
-- Puis ALTER DEFAULT sur toutes les tables tenant-scoped pour utiliser
-- cette fonction au lieu de l'UUID hardcode.
-- ============================================================

BEGIN;


-- ── 1. Fonction default_org_id() ─────────────────────────────
CREATE OR REPLACE FUNCTION public.default_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        public.auth_get_org_id(),
        'c0000000-0000-0000-0000-000000000001'::uuid
    );
$$;

GRANT EXECUTE ON FUNCTION public.default_org_id() TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.default_org_id() IS
'DEFAULT pour la colonne organization_id sur les tables tenant-scoped. Retourne auth_get_org_id() si user authentifie, sinon CERDIA Globale UUID. Permet aux nouveaux tenants d''INSERT sans passer explicitement organization_id (l''app cote client n''a pas encore ete tenant-aware refactoree).';


-- ── 2. ALTER DEFAULT sur toutes les tables tenant-scoped ─────
DO $$
DECLARE
    rec       RECORD;
    converted INT := 0;
BEGIN
    FOR rec IN
        SELECT table_name
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND column_name  = 'organization_id'
           -- exclure organizations elle-meme (id = PK, pas FK vers org)
           AND table_name NOT IN ('organizations')
         ORDER BY table_name
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER TABLE %I ALTER COLUMN organization_id SET DEFAULT public.default_org_id()',
                rec.table_name
            );
            converted := converted + 1;
            RAISE NOTICE '[155] %.organization_id DEFAULT → default_org_id()', rec.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[155] SKIP % : %', rec.table_name, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '[155] === % tables mises a jour ===', converted;
END $$;


-- ── 3. Verification ──────────────────────────────────────────
-- Doit montrer 'public.default_org_id()' comme default sur toutes
-- les tables tenant-scoped (au lieu de l'UUID hardcode).
SELECT
    table_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
  AND table_name NOT IN ('organizations')
ORDER BY table_name
LIMIT 10;


COMMIT;
