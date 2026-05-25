-- Migration 183: Fix permissions anonymes sur portfolio_profiles
-- Probleme: les colonnes physiques (height_cm, weight_kg, etc.) ne se sauvegardent pas
-- via le lien de remplissage (utilisateur anon).
-- Cause possible: GRANT UPDATE manquant sur les nouvelles colonnes pour le role anon.

-- 1. S'assurer que les colonnes existent (idempotent)
ALTER TABLE portfolio_profiles
  ADD COLUMN IF NOT EXISTS height_cm      integer,
  ADD COLUMN IF NOT EXISTS weight_kg      numeric(4,1),
  ADD COLUMN IF NOT EXISTS eye_color      text,
  ADD COLUMN IF NOT EXISTS hair_color     text,
  ADD COLUMN IF NOT EXISTS hair_length    text,
  ADD COLUMN IF NOT EXISTS skin_tone      text,
  ADD COLUMN IF NOT EXISTS shoe_size      text,
  ADD COLUMN IF NOT EXISTS clothing_size  text,
  ADD COLUMN IF NOT EXISTS languages      text[],
  ADD COLUMN IF NOT EXISTS special_skills text;

-- 2. Grant SELECT et UPDATE explicites sur toute la table pour anon et authenticated
--    (couvre toutes les colonnes existantes et futures)
GRANT SELECT, UPDATE ON TABLE portfolio_profiles TO anon;
GRANT SELECT, UPDATE ON TABLE portfolio_profiles TO authenticated;

-- 3. Recreer la politique UPDATE fill_token pour s'assurer qu'elle est active
DROP POLICY IF EXISTS "portfolio_fill_token_update" ON portfolio_profiles;
CREATE POLICY "portfolio_fill_token_update" ON portfolio_profiles
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. S'assurer que la politique SELECT fill_token est active
DROP POLICY IF EXISTS "portfolio_fill_token_read" ON portfolio_profiles;
CREATE POLICY "portfolio_fill_token_read" ON portfolio_profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- 5. S'assurer que RLS est active
ALTER TABLE portfolio_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  RAISE NOTICE 'Migration 183: permissions anon corrigees sur portfolio_profiles.';
END $$;
