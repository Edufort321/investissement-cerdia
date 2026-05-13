-- ============================================================
-- Migration 151 : Multi-Tenant — update handle_new_user trigger
--
-- Le trigger handle_new_user (mig 139) INSERT dans profiles sans
-- organization_id. Or post-mig 145 cette colonne est NOT NULL.
-- → Toute creation d'auth user via admin.createUser() planterait.
--
-- Fix : le trigger lit raw_user_meta_data pour :
--   - organization_id (UUID) → tenant cible
--   - role (TEXT)            → role initial (defaults org_investor)
--   - full_name (TEXT)       → deja gere avant
--
-- Fallback si pas de metadata :
--   - organization_id = CERDIA Globale (uuid c0000000-...001)
--   - role            = org_investor
--
-- Usage côté API server-side :
--   await supabase.auth.admin.createUser({
--     email, password, email_confirm: true,
--     user_metadata: {
--       full_name: 'John Doe',
--       organization_id: '<new-tenant-uuid>',
--       role: 'org_admin',
--     },
--   })
-- ⇒ le trigger cree automatiquement le profile correct.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    meta_org_id  UUID;
    meta_role    TEXT;
    meta_name    TEXT;
BEGIN
    -- Lecture des metadonnees (peut etre NULL si pas passees)
    meta_org_id := NULLIF(NEW.raw_user_meta_data->>'organization_id', '')::uuid;
    meta_role   := NULLIF(NEW.raw_user_meta_data->>'role', '');
    meta_name   := NULLIF(NEW.raw_user_meta_data->>'full_name', '');

    INSERT INTO profiles (id, full_name, organization_id, role)
    VALUES (
        NEW.id,
        COALESCE(meta_name, NEW.email),
        COALESCE(meta_org_id, 'c0000000-0000-0000-0000-000000000001'::uuid),
        COALESCE(meta_role, 'org_investor')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS
'Trigger auto-creation de profile a chaque INSERT dans auth.users. Lit organization_id et role depuis raw_user_meta_data si fournis (cas admin.createUser depuis l API multi-tenant). Fallback : CERDIA Globale + org_investor.';

-- Le trigger lui-meme reste tel quel (cree en mig 139). On a juste mis a jour la fonction.

-- ── Verification ────────────────────────────────────────────
-- La fonction est-elle correctement mise a jour ?
SELECT
    proname,
    LENGTH(prosrc) AS source_length,
    prosecdef      AS is_security_definer
FROM pg_proc
WHERE proname = 'handle_new_user';

COMMIT;
