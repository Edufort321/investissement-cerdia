-- =====================================================
-- SCRIPT 61 : STORAGE BUCKET POUR DOCUMENTS DU LIVRE D'ENTREPRISE
-- Bucket pour stocker les documents légaux et contrats
-- Date: 2025-10-24
-- =====================================================

-- =====================================================
-- 1. CRÉER LE BUCKET DE STOCKAGE
-- =====================================================

-- Créer le bucket 'corporate-documents' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('corporate-documents', 'corporate-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. POLITIQUES RLS POUR LE BUCKET
-- =====================================================

-- Policy: Permettre aux utilisateurs authentifiés de LIRE les documents
CREATE POLICY "Allow authenticated users to read corporate documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'corporate-documents');

-- Policy: Permettre aux utilisateurs authentifiés d'UPLOADER des documents
CREATE POLICY "Allow authenticated users to upload corporate documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'corporate-documents');

-- Policy: Permettre aux utilisateurs authentifiés de METTRE À JOUR des documents
CREATE POLICY "Allow authenticated users to update corporate documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'corporate-documents')
WITH CHECK (bucket_id = 'corporate-documents');

-- Policy: Permettre aux utilisateurs authentifiés de SUPPRIMER des documents
CREATE POLICY "Allow authenticated users to delete corporate documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'corporate-documents');

-- =====================================================
-- CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ STORAGE BUCKET CRÉÉ AVEC SUCCÈS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Bucket: corporate-documents';
  RAISE NOTICE 'Visibilité: Privé (authentification requise)';
  RAISE NOTICE '';
  RAISE NOTICE 'Politiques RLS activées:';
  RAISE NOTICE '  ✓ Lecture (authenticated)';
  RAISE NOTICE '  ✓ Upload (authenticated)';
  RAISE NOTICE '  ✓ Mise à jour (authenticated)';
  RAISE NOTICE '  ✓ Suppression (authenticated)';
  RAISE NOTICE '';
  RAISE NOTICE 'Types de documents acceptés:';
  RAISE NOTICE '  - Actes notariés';
  RAISE NOTICE '  - Contrats';
  RAISE NOTICE '  - Résolutions';
  RAISE NOTICE '  - Procès-verbaux';
  RAISE NOTICE '  - Conventions de commanditaire';
  RAISE NOTICE '  - Certificats';
  RAISE NOTICE '  - Documents légaux';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
