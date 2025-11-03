-- Migration 019: Créer le bucket pour les pièces jointes d'événements
-- Description: Crée un bucket Supabase Storage pour stocker les PDFs, billets et autres attachments

-- =====================================================
-- BUCKET: voyage-event-attachments (PRIVÉ)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voyage-event-attachments',
  'voyage-event-attachments',
  false, -- Private bucket
  10485760, -- 10 MB en bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

-- =====================================================
-- POLICIES RLS POUR LE BUCKET
-- =====================================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can upload event attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view event attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete event attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update event attachments" ON storage.objects;

-- =====================================================
-- POLICY 1: INSERT (Upload)
-- =====================================================
CREATE POLICY "Users can upload event attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voyage-event-attachments'
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- POLICY 2: SELECT (View/Download)
-- =====================================================
CREATE POLICY "Users can view event attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voyage-event-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- POLICY 3: DELETE (Suppression)
-- =====================================================
CREATE POLICY "Users can delete event attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voyage-event-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- POLICY 4: UPDATE (Modification métadonnées)
-- =====================================================
CREATE POLICY "Users can update event attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voyage-event-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'voyage-event-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- FONCTION HELPER POUR GÉNÉRER CHEMIN DE FICHIER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_event_attachment_path(
  event_id_param TEXT,
  filename TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN auth.uid()::TEXT || '/' || event_id_param || '/' || filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_event_attachment_path(TEXT, TEXT) IS
'Génère le chemin complet pour une pièce jointe d''événement: {user_id}/{event_id}/{filename}';

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Vérification
SELECT
  '✅ MIGRATION 019 TERMINÉE - Bucket voyage-event-attachments créé avec succès' AS status;

SELECT
  id AS "Bucket ID",
  name AS "Nom",
  CASE WHEN public THEN 'Public' ELSE 'Privé' END AS "Visibilité",
  file_size_limit / 1048576 AS "Limite (MB)",
  array_length(allowed_mime_types, 1) AS "Types de fichiers autorisés"
FROM storage.buckets
WHERE id = 'voyage-event-attachments';
