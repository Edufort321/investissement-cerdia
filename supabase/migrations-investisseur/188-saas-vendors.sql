-- Migration 188 : Représentants commerciaux pour la plateforme SaaS CERDIA
-- Exécuter dans le SQL Editor de Supabase Dashboard

CREATE TABLE IF NOT EXISTS saas_vendors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text,
  phone           text,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.20,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saas_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saas_vendors_super_admin" ON saas_vendors FOR ALL USING (true) WITH CHECK (true);

-- Colonne vendor sur les organisations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES saas_vendors(id) ON DELETE SET NULL;
