-- Migration 178: Ajout support video dans le bucket portfolio
-- Augmente la limite de taille et ajoute les types MIME video

UPDATE storage.buckets
SET
  file_size_limit  = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    'video/mpeg', 'video/ogg'
  ]
WHERE id = 'portfolio';

DO $$ BEGIN
  RAISE NOTICE 'Migration 178: video support ajoute au bucket portfolio (limite 100MB).';
END $$;
