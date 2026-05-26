-- Migration 185 : colonne type sur home_slides (hero | platform)
ALTER TABLE home_slides ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'hero';
