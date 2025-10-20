-- ==========================================
-- CONFIGURATION STORAGE POLICIES
-- RLS pour buckets transaction-attachments et property-attachments
-- ==========================================

-- ⚠️ IMPORTANT: Les buckets doivent être créés manuellement dans Supabase Dashboard
-- 1. transaction-attachments (privé)
-- 2. property-attachments (privé)

-- ==========================================
-- POLICIES pour transaction-attachments
-- ==========================================

-- Policy 1: SELECT (Read)
DROP POLICY IF EXISTS "Users can view transaction attachments" ON storage.objects;
CREATE POLICY "Users can view transaction attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'transaction-attachments');

-- Policy 2: INSERT (Upload)
DROP POLICY IF EXISTS "Users can upload transaction attachments" ON storage.objects;
CREATE POLICY "Users can upload transaction attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'transaction-attachments');

-- Policy 3: UPDATE
DROP POLICY IF EXISTS "Users can update transaction attachments" ON storage.objects;
CREATE POLICY "Users can update transaction attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'transaction-attachments')
WITH CHECK (bucket_id = 'transaction-attachments');

-- Policy 4: DELETE
DROP POLICY IF EXISTS "Users can delete transaction attachments" ON storage.objects;
CREATE POLICY "Users can delete transaction attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'transaction-attachments');

-- ==========================================
-- POLICIES pour property-attachments
-- ==========================================

-- Policy 1: SELECT (Read)
DROP POLICY IF EXISTS "Users can view property attachments" ON storage.objects;
CREATE POLICY "Users can view property attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-attachments');

-- Policy 2: INSERT (Upload)
DROP POLICY IF EXISTS "Users can upload property attachments" ON storage.objects;
CREATE POLICY "Users can upload property attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-attachments');

-- Policy 3: UPDATE
DROP POLICY IF EXISTS "Users can update property attachments" ON storage.objects;
CREATE POLICY "Users can update property attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-attachments')
WITH CHECK (bucket_id = 'property-attachments');

-- Policy 4: DELETE
DROP POLICY IF EXISTS "Users can delete property attachments" ON storage.objects;
CREATE POLICY "Users can delete property attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-attachments');

-- ==========================================
-- VÉRIFICATION
-- ==========================================

-- Lister tous les buckets
SELECT
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
ORDER BY name;

-- Lister toutes les policies sur storage.objects
SELECT
  policyname,
  tablename,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- Message de confirmation
SELECT '✅ Storage policies créées pour transaction-attachments et property-attachments' AS message;
SELECT '⚠️  N''oubliez pas de créer les buckets manuellement dans Supabase Dashboard' AS reminder;
