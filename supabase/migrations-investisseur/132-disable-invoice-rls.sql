-- Migration 132: Désactiver RLS sur les tables de facturation
-- Ces tables sont protégées côté application (mot de passe admin).
-- RLS bloque les accès quand la session Supabase est expirée.

ALTER TABLE invoice_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON invoice_clients;
DROP POLICY IF EXISTS "Allow all for authenticated" ON invoices;
DROP POLICY IF EXISTS "Allow all for authenticated" ON invoice_items;
