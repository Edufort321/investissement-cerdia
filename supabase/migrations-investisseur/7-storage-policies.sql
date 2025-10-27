-- =====================================================
-- SCRIPT 7/7: CONFIGURATION STORAGE ET POLICIES
-- Configure le bucket documents et ses politiques
-- =====================================================

-- Créer le bucket documents (si pas déjà fait manuellement)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Politique: Permettre à tous les utilisateurs authentifiés de lire
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Politique: Permettre à tous les utilisateurs authentifiés d'uploader
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Politique: Permettre à tous les utilisateurs authentifiés de mettre à jour
CREATE POLICY "Allow authenticated users to update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Politique: Permettre à tous les utilisateurs authentifiés de supprimer
CREATE POLICY "Allow authenticated users to delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Message de confirmation
SELECT '✅ STORAGE CONFIGURÉ - Bucket documents prêt!' AS message;
