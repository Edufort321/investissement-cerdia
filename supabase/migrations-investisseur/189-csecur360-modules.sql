-- Migration 189 : Catalogue de modules C-Secur360 synchronisé
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

CREATE TABLE IF NOT EXISTS csecur360_modules (
  key             text PRIMARY KEY,
  name_fr         text NOT NULL,
  name_en         text NOT NULL,
  monthly_price   numeric(10,2) NOT NULL DEFAULT 0,
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  active_tenants  int NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE csecur360_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csecur360_modules_super_admin" ON csecur360_modules FOR ALL USING (true) WITH CHECK (true);
