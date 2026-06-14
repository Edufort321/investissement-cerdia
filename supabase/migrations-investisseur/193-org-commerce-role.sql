-- 193 — Rôle « org_commerce » : administrateur COMMERCE uniquement (accès /commerce, PAS la zone
-- investisseur). Étend la CHECK constraint des rôles. Idempotent.

DO $$
DECLARE cn TEXT;
BEGIN
  SELECT con.conname INTO cn
  FROM pg_constraint con JOIN pg_class cls ON cls.oid = con.conrelid JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  WHERE cls.relname = 'profiles' AND nsp.nspname = 'public' AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%role%';
  IF cn IS NOT NULL THEN EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', cn); END IF;
END $$;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','org_admin','org_investor','org_viewer','org_user','org_commerce'));

NOTIFY pgrst, 'reload schema';
