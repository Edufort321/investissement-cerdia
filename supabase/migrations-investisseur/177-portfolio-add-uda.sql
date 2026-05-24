-- Migration 177: Ajout du numero UDA au portfolio artistique
-- UDA = Union des Artistes (Quebec) — numero de membre professionnel

ALTER TABLE portfolio_profiles
  ADD COLUMN IF NOT EXISTS uda_number text;

DO $$ BEGIN
  RAISE NOTICE 'Migration 177: colonne uda_number ajoutee a portfolio_profiles.';
END $$;
