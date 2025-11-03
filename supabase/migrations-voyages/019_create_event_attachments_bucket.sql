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

-- Policy 1: INSERT - Permettre l'upload de fichiers pour les utilisateurs authentifiés
CREATE POLICY "Users can upload event attachments to their own voyages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voyage-event-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: SELECT - Permettre la lecture des fichiers de l'utilisateur
CREATE POLICY "Users can view their own event attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voyage-event-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: UPDATE - Permettre la modification des fichiers de l'utilisateur
CREATE POLICY "Users can update their own event attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voyage-event-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'voyage-event-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: DELETE - Permettre la suppression des fichiers de l'utilisateur
CREATE POLICY "Users can delete their own event attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voyage-event-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- COMMENTAIRES ET VÉRIFICATION
-- =====================================================

COMMENT ON POLICY "Users can upload event attachments to their own voyages" ON storage.objects
IS 'Permet aux utilisateurs d''uploader des pièces jointes pour leurs événements';

COMMENT ON POLICY "Users can view their own event attachments" ON storage.objects
IS 'Permet aux utilisateurs de voir leurs propres pièces jointes d''événements';

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
