-- ============================================================
-- Migration 101: gmail_invoices — RLS patch
-- Permet au script Python local (clé anon) de faire les upserts
-- et à l'app Next.js (clé anon) de lire et mettre à jour.
-- ============================================================

-- Supprimer les anciennes politiques trop restrictives
DROP POLICY IF EXISTS "service_role_all"              ON gmail_invoices;
DROP POLICY IF EXISTS "authenticated_read"             ON gmail_invoices;
DROP POLICY IF EXISTS "authenticated_update_company"   ON gmail_invoices;

-- Lecture pour tout le monde (anon + authenticated)
CREATE POLICY "public_read" ON gmail_invoices
    FOR SELECT USING (true);

-- Insert/Update pour tout le monde (script local + app)
-- La table est interne admin — pas de données personnelles d'autres users
CREATE POLICY "public_write" ON gmail_invoices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update" ON gmail_invoices
    FOR UPDATE USING (true) WITH CHECK (true);
