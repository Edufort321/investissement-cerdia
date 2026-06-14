-- Migration 186 : clients C-Secur360 synchronises depuis la plateforme de securite
CREATE TABLE IF NOT EXISTS csecur360_clients (
  id               text PRIMARY KEY,
  company_name     text NOT NULL,
  admin_email      text,
  plan             text DEFAULT 'professional',
  monthly_revenue  numeric(10,2) DEFAULT 0,
  annual_revenue   numeric(10,2) DEFAULT 0,
  modules_count    integer DEFAULT 0,
  sites_count      integer DEFAULT 1,
  status           text DEFAULT 'active',
  synced_at        timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE csecur360_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csecur360_service_role_all" ON csecur360_clients;
CREATE POLICY "csecur360_service_role_all"
  ON csecur360_clients FOR ALL USING (true);
