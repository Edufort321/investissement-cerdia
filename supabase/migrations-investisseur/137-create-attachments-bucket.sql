-- Migration 137: Création du bucket 'attachments' pour le commerce admin
-- Utilisé pour: images produits, pièces jointes transactions, documents produits

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'text/csv'
  ];

-- Policies pour accès anonyme (commerce admin utilise sessionStorage, pas Supabase auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anon insert attachments'
  ) THEN
    CREATE POLICY "Allow anon insert attachments"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anon select attachments'
  ) THEN
    CREATE POLICY "Allow anon select attachments"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Allow anon update attachments'
  ) THEN
    CREATE POLICY "Allow anon update attachments"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'attachments');
  END IF;

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

SELECT '✅ Bucket attachments créé (public, 50MB) + policies anon' AS status;
