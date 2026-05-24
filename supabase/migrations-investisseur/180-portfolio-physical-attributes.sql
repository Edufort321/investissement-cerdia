-- Migration 180: Caracteristiques physiques pour le portfolio artistique
-- Utilisees par les agences pour le casting

ALTER TABLE portfolio_profiles
  ADD COLUMN IF NOT EXISTS height_cm      integer,      -- taille en cm
  ADD COLUMN IF NOT EXISTS weight_kg      numeric(4,1), -- poids en kg
  ADD COLUMN IF NOT EXISTS eye_color      text,         -- couleur des yeux
  ADD COLUMN IF NOT EXISTS hair_color     text,         -- couleur des cheveux
  ADD COLUMN IF NOT EXISTS hair_length    text,         -- longueur cheveux: court/mi-long/long
  ADD COLUMN IF NOT EXISTS skin_tone      text,         -- teint: clair/moyen/olive/fonce
  ADD COLUMN IF NOT EXISTS shoe_size      text,         -- pointure
  ADD COLUMN IF NOT EXISTS clothing_size  text,         -- taille vetement (XS/S/M/L/XL ou num)
  ADD COLUMN IF NOT EXISTS languages      text[],       -- langues parlees
  ADD COLUMN IF NOT EXISTS special_skills text;         -- competences speciales (conduite, sport...)

DO $$ BEGIN
  RAISE NOTICE 'Migration 180: caracteristiques physiques ajoutees a portfolio_profiles.';
END $$;
