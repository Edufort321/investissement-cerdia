-- Migration 136: Politiques RLS pour le bucket 'attachments'
-- Le commerce admin utilise une auth par sessionStorage (pas Supabase auth),
-- donc les opérations storage se font en tant qu'utilisateur anonyme.

DO $$
BEGIN
  -- INSERT (upload)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anon insert attachments'
  ) THEN
    CREATE POLICY "Allow anon insert attachments"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'attachments');
  END IF;

  -- SELECT (lecture / getPublicUrl)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anon select attachments'
  ) THEN
    CREATE POLICY "Allow anon select attachments"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'attachments');
  END IF;

  -- UPDATE (upsert)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anon update attachments'
  ) THEN
    CREATE POLICY "Allow anon update attachments"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'attachments');
  END IF;

  -- DELETE (suppression)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anon delete attachments'
  ) THEN
    CREATE POLICY "Allow anon delete attachments"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'attachments');
  END IF;
END $$;
