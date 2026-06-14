-- Migration 187 : vendeurs C-Secur360 + colonnes vendor_id / billable sur les clients
-- Exécuter dans le SQL Editor de Supabase Dashboard

-- Table des représentants commerciaux (miroir de vendors dans C-Secur360)
-- L'UUID est le même que dans C-Secur360 pour faciliter la sync
CREATE TABLE IF NOT EXISTS csecur360_vendors (
  id             uuid PRIMARY KEY,
  name           text NOT NULL,
  email          text,
  phone          text,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.20,
  is_active      boolean NOT NULL DEFAULT true,
  notes          text,
  synced_at      timestamptz DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE csecur360_vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "csecur360_vendors_service_all" ON csecur360_vendors;
CREATE POLICY "csecur360_vendors_service_all" ON csecur360_vendors FOR ALL USING (true);

-- Colonnes supplémentaires sur csecur360_clients
ALTER TABLE csecur360_clients
  ADD COLUMN IF NOT EXISTS vendor_id  uuid REFERENCES csecur360_vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billable   boolean NOT NULL DEFAULT true;
