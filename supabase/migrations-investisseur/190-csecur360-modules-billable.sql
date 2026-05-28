-- Migration 190 : Ajoute billable_tenants à csecur360_modules
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

ALTER TABLE csecur360_modules
  ADD COLUMN IF NOT EXISTS billable_tenants int NOT NULL DEFAULT 0;
