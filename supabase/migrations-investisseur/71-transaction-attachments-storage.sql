-- =====================================================
-- 📁 STORAGE: PIÈCES JOINTES TRANSACTIONS
-- =====================================================
-- Configuration Supabase Storage pour les pièces jointes
-- Date: 2025-10-25

-- 1. Créer le bucket (via Dashboard Supabase ou API)
-- =====================================================
--
-- IMPORTANT: Ce bucket doit être créé via le Dashboard Supabase:
--
-- 1. Aller dans Storage
-- 2. Créer un nouveau bucket:
--    - Nom: transaction-attachments
--    - Public: false (accès contrôlé par policies)
--    - Allowed MIME types: image/*, application/pdf, application/vnd.*, application/msword*
--    - Max file size: 10 MB
--
-- Ou via SQL (si supporté):
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'transaction-attachments',
--   'transaction-attachments',
--   false,
--   10485760,  -- 10 MB
--   ARRAY['image/*', 'application/pdf', 'application/vnd.*', 'application/msword*']::text[]
-- ) ON CONFLICT (id) DO NOTHING;

-- 2. Helper functions pour vérification
-- =====================================================

-- Fonction pour vérifier si user est admin
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

-- Fonction pour obtenir l'investor_id actuel
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

-- 3. POLICIES: SELECT (téléchargement)
-- =====================================================

-- Admin peut voir tous les fichiers
CREATE POLICY "Admin can view all transaction attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND is_admin()
);

-- User peut voir ses propres transactions ou transactions de ses propriétés
CREATE POLICY "Users can view own transaction attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND (
    -- Transactions liées à l'investisseur
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.attachment_storage_path = name
      AND (
        t.investor_id = get_current_investor_id()
        OR
        -- Transactions de propriétés où l'investisseur a des parts
        t.property_id IN (
          SELECT DISTINCT property_id FROM transactions
          WHERE investor_id = get_current_investor_id()
        )
      )
    )
  )
);

-- 4. POLICIES: INSERT (upload)
-- =====================================================

-- Admin peut uploader partout
CREATE POLICY "Admin can upload transaction attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transaction-attachments'
  AND is_admin()
);

-- Users peuvent uploader dans leur scope
CREATE POLICY "Users can upload own transaction attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transaction-attachments'
  AND (
    -- Le chemin doit contenir l'ID de l'investisseur
    name LIKE '%/' || get_current_investor_id()::TEXT || '/%'
    OR
    -- Ou être dans un dossier global avec permission
    is_admin()
  )
);

-- 5. POLICIES: UPDATE (remplacement)
-- =====================================================

CREATE POLICY "Admin can update transaction attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND is_admin()
)
WITH CHECK (
  bucket_id = 'transaction-attachments'
  AND is_admin()
);

CREATE POLICY "Users can update own transaction attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.attachment_storage_path = name
    AND t.investor_id = get_current_investor_id()
  )
)
WITH CHECK (
  bucket_id = 'transaction-attachments'
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.attachment_storage_path = name
    AND t.investor_id = get_current_investor_id()
  )
);

-- 6. POLICIES: DELETE (suppression)
-- =====================================================

CREATE POLICY "Admin can delete transaction attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND is_admin()
);

CREATE POLICY "Users can delete own transaction attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.attachment_storage_path = name
    AND t.investor_id = get_current_investor_id()
  )
);

-- 7. Trigger pour nettoyer fichiers orphelins
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_transaction_attachment()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on supprime une transaction avec pièce jointe
  -- ou si on change la pièce jointe, supprimer l'ancien fichier
  IF OLD.attachment_storage_path IS NOT NULL THEN
    -- Note: La suppression réelle doit être faite côté client
    -- via Supabase Storage API car les triggers ne peuvent pas
    -- appeler directement l'API Storage
    RAISE LOG 'Transaction attachment to cleanup: %', OLD.attachment_storage_path;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_transaction_attachment ON transactions;
CREATE TRIGGER trigger_cleanup_transaction_attachment
  BEFORE DELETE OR UPDATE OF attachment_storage_path
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_transaction_attachment();

-- =====================================================
-- 📋 STRUCTURE DES CHEMINS
-- =====================================================
--
-- Structure recommandée des chemins:
--
-- transaction-attachments/
-- ├── {investor_id}/
-- │   ├── {year}/
-- │   │   ├── {transaction_id}-{filename}.pdf
-- │   │   ├── {transaction_id}-{filename}.jpg
-- │   │   └── ...
-- │   └── ...
-- └── shared/  (pour documents administratifs)
--
-- Exemple:
-- transaction-attachments/550e8400-e29b-41d4-a716-446655440000/2025/abc123-facture-electricite.pdf
--
-- Avantages:
-- - Organisation par investisseur
-- - Organisation par année
-- - Nom prévisible avec ID transaction
-- - Facile à nettoyer/archiver

-- =====================================================
-- 📊 STATISTIQUES BUCKET
-- =====================================================

-- Vue pour monitorer l'usage du storage
CREATE OR REPLACE VIEW transaction_attachments_storage_stats AS
SELECT
  bucket_id,
  COUNT(*) as total_files,
  SUM((metadata->>'size')::BIGINT) as total_bytes,
  ROUND(SUM((metadata->>'size')::BIGINT) / 1024.0 / 1024.0, 2) as total_mb,
  AVG((metadata->>'size')::BIGINT) as avg_file_bytes,
  MIN(created_at) as oldest_file,
  MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id = 'transaction-attachments'
GROUP BY bucket_id;

-- =====================================================
-- ✅ VÉRIFICATION
-- =====================================================

-- Lister les policies créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%transaction%'
ORDER BY policyname;
