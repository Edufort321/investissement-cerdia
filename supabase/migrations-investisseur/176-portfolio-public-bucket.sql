-- Migration 176: Bucket public pour les photos du portfolio artistique
-- Le bucket 'documents' est prive (investisseur) — les photos portfolio
-- ont besoin d'un bucket public pour que getPublicUrl() fonctionne.

-- ── 1. Cree le bucket public 'portfolio' ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio',
  'portfolio',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── 2. Policies RLS sur storage.objects ──────────────────────────────────

-- Lecture publique (anon peut voir les photos via getPublicUrl)
DROP POLICY IF EXISTS "portfolio_bucket_public_read" ON storage.objects;
CREATE POLICY "portfolio_bucket_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'portfolio');

-- Upload depuis admin et lien de remplissage
DROP POLICY IF EXISTS "portfolio_bucket_upload" ON storage.objects;
CREATE POLICY "portfolio_bucket_upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'portfolio');

-- Mise a jour
DROP POLICY IF EXISTS "portfolio_bucket_update" ON storage.objects;
CREATE POLICY "portfolio_bucket_update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'portfolio')
WITH CHECK (bucket_id = 'portfolio');

-- Suppression
DROP POLICY IF EXISTS "portfolio_bucket_delete" ON storage.objects;
CREATE POLICY "portfolio_bucket_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'portfolio');

DO $$ BEGIN
  RAISE NOTICE 'Migration 176: bucket portfolio public cree avec policies.';
END $$;
