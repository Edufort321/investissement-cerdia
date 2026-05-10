-- ============================================================
-- Migration 139 : profiles + roles
--
-- Cree la table profiles miroir de auth.users avec un role,
-- les RLS, le trigger d'auto-creation, et seed Eric en owner.
--
-- Idempotent : peut etre execute plusieurs fois sans casse.
-- ============================================================

-- ── 1. Table profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL DEFAULT 'investor'
                            CHECK (role IN ('owner','admin','investor','viewer')),
    full_name   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- ── 2. RLS ───────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Le user peut lire son propre profile
DROP POLICY IF EXISTS "self_read_profile" ON profiles;
CREATE POLICY "self_read_profile" ON profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Owner/admin peuvent tout lire/ecrire
DROP POLICY IF EXISTS "admin_rw_profiles" ON profiles;
CREATE POLICY "admin_rw_profiles" ON profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('owner','admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('owner','admin')
        )
    );

-- Le user peut update son propre full_name (pas le role)
DROP POLICY IF EXISTS "self_update_profile" ON profiles;
CREATE POLICY "self_update_profile" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ── 3. Trigger : auto-creer un profile quand un user s'inscrit ─
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 4. Trigger : updated_at automatique ──────────────────────
CREATE OR REPLACE FUNCTION touch_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION touch_profiles_updated_at();

-- ── 5. Seed : profiles miroir pour les users auth.users existants ─
-- (au cas ou des users existaient avant la creation du trigger)
INSERT INTO profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ── 6. Seed : Eric en owner ──────────────────────────────────
UPDATE profiles
   SET role = 'owner',
       full_name = COALESCE(full_name, 'Eric Dufort')
 WHERE id = (SELECT id FROM auth.users WHERE email = 'eric.dufort@cerdia.ai' LIMIT 1);

-- ── 7. Verification finale ───────────────────────────────────
SELECT 'profiles total' AS info, COUNT(*) AS n FROM profiles
UNION ALL
SELECT 'owners',                  COUNT(*)      FROM profiles WHERE role = 'owner'
UNION ALL
SELECT 'admins',                  COUNT(*)      FROM profiles WHERE role = 'admin'
UNION ALL
SELECT 'investors',               COUNT(*)      FROM profiles WHERE role = 'investor';
