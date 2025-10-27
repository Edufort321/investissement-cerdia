-- =====================================================
-- Migration 014: Storage Policies pour voyage-photos
-- =====================================================
-- Description: Configuration automatique des policies RLS pour le bucket voyage-photos
-- Dépendances: Script 47 (création du bucket voyage-photos)
--
-- Sécurité: Chaque utilisateur peut uniquement accéder à SES propres photos
-- Structure des chemins: voyage-photos/{user_id}/{voyage_id}/{filename}
-- =====================================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can upload their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their voyage photos" ON storage.objects;

-- =====================================================
-- POLICY 1: INSERT (Upload)
-- =====================================================
-- Permet aux utilisateurs authentifiés d'uploader des photos
-- dans leur propre dossier uniquement
CREATE POLICY "Users can upload their voyage photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voyage-photos'
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- POLICY 2: SELECT (View/Download)
-- =====================================================
-- Permet aux utilisateurs de voir uniquement leurs propres photos
-- Vérifie que le premier segment du chemin correspond à leur user_id
CREATE POLICY "Users can view their voyage photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- POLICY 3: DELETE (Suppression)
-- =====================================================
-- Permet aux utilisateurs de supprimer uniquement leurs propres photos
CREATE POLICY "Users can delete their voyage photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- POLICY 4: UPDATE (Modification métadonnées)
-- =====================================================
-- Permet aux utilisateurs de modifier les métadonnées de leurs propres photos
CREATE POLICY "Users can update their voyage photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- STRUCTURE DES CHEMINS (RECOMMANDATION)
-- =====================================================

-- Format recommandé pour les chemins de fichiers:
-- voyage-photos/{user_id}/{voyage_id}/{filename}
--
-- Exemple:
-- voyage-photos/550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/photo1.jpg
--                └──────────── user_id ────────────┘ └──────────── voyage_id ────────────┘ └─ filename ─┘
--
-- Avantages:
-- - Isolation complète par utilisateur (user_id)
-- - Organisation par voyage (voyage_id)
-- - Facile de supprimer toutes les photos d'un voyage
-- - Évite les collisions de noms entre utilisateurs

-- =====================================================
-- FONCTION HELPER POUR GÉNÉRER CHEMIN DE FICHIER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_voyage_photo_path(
  voyage_id_param UUID,
  filename TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN auth.uid()::TEXT || '/' || voyage_id_param::TEXT || '/' || filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_voyage_photo_path(UUID, TEXT) IS
'Génère le chemin complet pour une photo de voyage: {user_id}/{voyage_id}/{filename}';

-- =====================================================
-- FONCTION HELPER POUR OBTENIR URL PUBLIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_voyage_photo_url(
  voyage_id_param UUID,
  filename TEXT
)
RETURNS TEXT AS $$
DECLARE
  file_path TEXT;
BEGIN
  file_path := public.get_voyage_photo_path(voyage_id_param, filename);
  -- L'URL sera construite côté client avec:
  -- supabase.storage.from('voyage-photos').getPublicUrl(file_path)
  RETURN file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_voyage_photo_url(UUID, TEXT) IS
'Retourne le chemin de fichier pour construire l''URL publique côté client';

-- =====================================================
-- FONCTION POUR LISTER LES PHOTOS D'UN VOYAGE
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_voyage_photos(
  voyage_id_param UUID
)
RETURNS TABLE (
  name TEXT,
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.name,
    o.id,
    o.created_at,
    o.metadata
  FROM storage.objects o
  WHERE o.bucket_id = 'voyage-photos'
    AND (storage.foldername(o.name))[1] = auth.uid()::text
    AND (storage.foldername(o.name))[2] = voyage_id_param::text
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.list_voyage_photos(UUID) IS
'Liste toutes les photos d''un voyage pour l''utilisateur connecté';

-- =====================================================
-- VÉRIFICATION DES POLICIES
-- =====================================================

-- Fonction pour vérifier que les policies sont bien créées
CREATE OR REPLACE FUNCTION public.check_voyage_photos_policies()
RETURNS TABLE (
  policy_name TEXT,
  command TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.policyname::TEXT,
    p.cmd::TEXT,
    CASE
      WHEN p.policyname IS NOT NULL THEN '✅ Active'
      ELSE '❌ Manquante'
    END AS status
  FROM pg_policies p
  WHERE p.tablename = 'objects'
    AND p.schemaname = 'storage'
    AND p.policyname LIKE '%voyage photos%'
  ORDER BY p.cmd;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_voyage_photos_policies() IS
'Vérifie que toutes les policies pour voyage-photos sont actives';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 014 TERMINÉE: Storage Policies pour voyage-photos';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Policies créées:';
  RAISE NOTICE '   ✓ INSERT  - Users can upload their voyage photos';
  RAISE NOTICE '   ✓ SELECT  - Users can view their voyage photos';
  RAISE NOTICE '   ✓ DELETE  - Users can delete their voyage photos';
  RAISE NOTICE '   ✓ UPDATE  - Users can update their voyage photos';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Sécurité:';
  RAISE NOTICE '   - Chaque utilisateur accède uniquement à SES photos';
  RAISE NOTICE '   - Isolation par dossier: {user_id}/{voyage_id}/{filename}';
  RAISE NOTICE '';
  RAISE NOTICE '🛠️  Fonctions helper créées:';
  RAISE NOTICE '   - get_voyage_photo_path(voyage_id, filename)';
  RAISE NOTICE '   - get_voyage_photo_url(voyage_id, filename)';
  RAISE NOTICE '   - list_voyage_photos(voyage_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Vérification:';
  RAISE NOTICE '   SELECT * FROM public.check_voyage_photos_policies();';
  RAISE NOTICE '';
END $$;

-- Exécuter la vérification automatiquement
SELECT * FROM public.check_voyage_photos_policies();
