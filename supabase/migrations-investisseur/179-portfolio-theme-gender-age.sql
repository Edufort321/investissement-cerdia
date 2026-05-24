-- Migration 179: Ajout theme visuel, genre et classe d'age au portfolio artistique

ALTER TABLE portfolio_profiles
  ADD COLUMN IF NOT EXISTS gender      text,        -- 'femme' | 'homme' | 'non-binaire'
  ADD COLUMN IF NOT EXISTS age_class   text,        -- 'enfant' | 'ado' | 'adulte' | 'senior'
  ADD COLUMN IF NOT EXISTS theme       text DEFAULT 'rose',  -- 'rose' | 'or' | 'argent' | 'bleu' | 'nature' | 'custom'
  ADD COLUMN IF NOT EXISTS theme_primary text,      -- hex custom ex: '#d4af37'
  ADD COLUMN IF NOT EXISTS theme_accent  text;      -- hex custom ex: '#c5a028'

DO $$ BEGIN
  RAISE NOTICE 'Migration 179: gender, age_class, theme, theme_primary, theme_accent ajoutes a portfolio_profiles.';
END $$;
