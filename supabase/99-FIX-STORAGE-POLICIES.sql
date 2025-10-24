-- =====================================================
-- SCRIPT DE CORRECTION STORAGE POLICIES - SÉCURITÉ
-- Remplace les policies "Allow all authenticated" par
-- des policies restrictives basées sur ownership
-- Date: 2025-10-24
-- =====================================================

-- ⚠️ IMPORTANT: Exécuter ce script pour corriger les vulnérabilités de sécurité
-- Les policies actuelles permettent à TOUS les utilisateurs authentifiés d'accéder à TOUS les fichiers

-- =====================================================
-- 1. FONCTION: Vérifier si l'utilisateur est admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM investors
    WHERE user_id = auth.uid()
    AND access_level = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FONCTION: Obtenir l'investor_id de l'utilisateur
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_investor_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM investors
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. BUCKET: documents (général)
-- =====================================================

-- Mettre le bucket en privé
UPDATE storage.buckets
SET public = false
WHERE id = 'documents';

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

-- READ: Utilisateurs peuvent lire leurs documents OU admins peuvent tout lire
CREATE POLICY "Users read own documents or admin reads all"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Admin peut tout voir
    is_admin()
    OR
    -- Document appartient à l'utilisateur
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.storage_path = name
      AND (
        d.uploaded_by = get_current_investor_id()
        OR d.investor_id = get_current_investor_id()
      )
    )
  )
);

-- INSERT: Utilisateurs peuvent uploader leurs documents
CREATE POLICY "Users upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
);

-- DELETE: Utilisateurs peuvent supprimer leurs documents OU admins peuvent tout supprimer
CREATE POLICY "Users delete own documents or admin deletes all"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_admin()
    OR
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.storage_path = name
      AND (
        d.uploaded_by = get_current_investor_id()
        OR d.investor_id = get_current_investor_id()
      )
    )
  )
);

-- =====================================================
-- 4. BUCKET: transaction-attachments
-- =====================================================

-- Mettre le bucket en privé
UPDATE storage.buckets
SET public = false
WHERE id = 'transaction-attachments';

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Authenticated users can view transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete transaction attachments" ON storage.objects;

-- READ: Utilisateurs peuvent lire les pièces jointes de leurs transactions
CREATE POLICY "Users read own transaction attachments or admin reads all"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND (
    is_admin()
    OR
    EXISTS (
      SELECT 1 FROM transaction_attachments ta
      JOIN transactions t ON ta.transaction_id = t.id
      WHERE ta.storage_path = name
      AND t.investor_id = get_current_investor_id()
    )
  )
);

-- INSERT: Utilisateurs peuvent uploader dans leurs transactions
CREATE POLICY "Users upload own transaction attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transaction-attachments'
  AND auth.role() = 'authenticated'
);

-- DELETE: Utilisateurs peuvent supprimer leurs pièces jointes
CREATE POLICY "Users delete own transaction attachments or admin deletes all"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND (
    is_admin()
    OR
    EXISTS (
      SELECT 1 FROM transaction_attachments ta
      JOIN transactions t ON ta.transaction_id = t.id
      WHERE ta.storage_path = name
      AND t.investor_id = get_current_investor_id()
    )
  )
);

-- =====================================================
-- 5. BUCKET: scenario-documents
-- =====================================================

-- Mettre le bucket en privé
UPDATE storage.buckets
SET public = false
WHERE id = 'scenario-documents';

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Authenticated users can read scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scenario documents" ON storage.objects;

-- READ: Tous peuvent lire (scenarios sont partagés entre investisseurs)
CREATE POLICY "Authenticated users read scenario documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'scenario-documents');

-- INSERT/DELETE: Seulement admins
CREATE POLICY "Only admins manage scenario documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scenario-documents'
  AND is_admin()
);

CREATE POLICY "Only admins delete scenario documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scenario-documents'
  AND is_admin()
);

-- =====================================================
-- 6. BUCKET: corporate-documents
-- =====================================================

-- Mettre le bucket en privé
UPDATE storage.buckets
SET public = false
WHERE id = 'corporate-documents';

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow authenticated users to read corporate documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload corporate documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete corporate documents" ON storage.objects;

-- READ: Tous peuvent lire (documents corporatifs partagés)
CREATE POLICY "Authenticated users read corporate documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'corporate-documents');

-- INSERT/DELETE: Seulement admins
CREATE POLICY "Only admins manage corporate documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'corporate-documents'
  AND is_admin()
);

CREATE POLICY "Only admins delete corporate documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'corporate-documents'
  AND is_admin()
);

-- =====================================================
-- CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ STORAGE POLICIES CORRIGÉES AVEC SUCCÈS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Buckets sécurisés:';
  RAISE NOTICE '  ✓ documents (scope: uploaded_by/investor_id)';
  RAISE NOTICE '  ✓ transaction-attachments (scope: transaction investor_id)';
  RAISE NOTICE '  ✓ scenario-documents (read all, admin write)';
  RAISE NOTICE '  ✓ corporate-documents (read all, admin write)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT:';
  RAISE NOTICE '  1. Tous les buckets sont maintenant PRIVÉS';
  RAISE NOTICE '  2. Fonctions créées: is_admin(), get_current_investor_id()';
  RAISE NOTICE '  3. Tester l''accès avec un compte non-admin';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
