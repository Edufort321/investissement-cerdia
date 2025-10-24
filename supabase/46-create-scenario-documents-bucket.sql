-- =====================================================
-- SCRIPT 46: CRÉATION DU BUCKET SCENARIO-DOCUMENTS
--
-- Ce script crée le bucket de stockage pour les photos
-- et documents des scénarios.
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- Créer le bucket scenario-documents s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scenario-documents',
  'scenario-documents',
  false, -- Private bucket
  52428800, -- 50 MB en bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

-- Message de confirmation
SELECT 'MIGRATION 46 TERMINEE - Bucket scenario-documents créé' AS status;

-- Afficher les informations du bucket
SELECT
  id,
  name,
  public,
  file_size_limit / 1048576 as "Limite (MB)",
  created_at
FROM storage.buckets
WHERE id = 'scenario-documents';
