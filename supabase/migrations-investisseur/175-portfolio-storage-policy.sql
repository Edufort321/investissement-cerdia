-- Migration 175: Storage policies pour portfolio artistique
-- Permet la lecture publique des photos portfolio dans le bucket 'documents'
-- et l'upload depuis les pages publiques (lien de remplissage)

-- Lecture publique des fichiers portfolio (anon peut voir les photos)
DROP POLICY IF EXISTS "portfolio_storage_public_read" ON storage.objects;
CREATE POLICY "portfolio_storage_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'documents' AND name LIKE 'portfolio/%');

-- Upload depuis le lien de remplissage (anon + authenticated)
DROP POLICY IF EXISTS "portfolio_storage_upload" ON storage.objects;
CREATE POLICY "portfolio_storage_upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'documents' AND name LIKE 'portfolio/%');

-- Mise a jour des fichiers portfolio
DROP POLICY IF EXISTS "portfolio_storage_update" ON storage.objects;
CREATE POLICY "portfolio_storage_update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'documents' AND name LIKE 'portfolio/%')
WITH CHECK (bucket_id = 'documents' AND name LIKE 'portfolio/%');

-- Suppression (authenticated seulement)
DROP POLICY IF EXISTS "portfolio_storage_delete" ON storage.objects;
CREATE POLICY "portfolio_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND name LIKE 'portfolio/%');

DO $$ BEGIN
  RAISE NOTICE 'Migration 175: policies storage portfolio crees sur bucket documents.';
END $$;
