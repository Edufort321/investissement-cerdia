-- Migration 013: Configuration automatique du Storage
-- Description: Crée le bucket voyage-photos via insertion SQL directe

-- ====================================
-- IMPORTANT: EXÉCUTER LE SCRIPT 47
-- ====================================

-- Le bucket voyage-photos est créé automatiquement avec TOUS les autres buckets
-- via le script existant: 47-create-all-storage-buckets.sql

-- Ce fichier est conservé pour référence dans l'ordre des migrations Mon Voyage,
-- mais l'exécution réelle se fait via le script 47.

-- ====================================
-- VÉRIFICATION
-- ====================================

-- Fonction pour vérifier si le bucket existe
CREATE OR REPLACE FUNCTION public.check_voyage_photos_bucket()
RETURNS TABLE (
  bucket_exists BOOLEAN,
  message TEXT
) AS $$
DECLARE
  exists_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM storage.buckets
  WHERE id = 'voyage-photos';

  IF exists_count > 0 THEN
    RETURN QUERY SELECT
      true AS bucket_exists,
      '✅ Le bucket voyage-photos existe et est prêt!' AS message;
  ELSE
    RETURN QUERY SELECT
      false AS bucket_exists,
      '⚠️  Le bucket voyage-photos n''existe pas encore.

      Pour le créer automatiquement:
      → Exécutez le script: 47-create-all-storage-buckets.sql

      Configuration:
      - Privé (non public)
      - Limite: 5 MB
      - Types: JPEG, PNG, WebP, PDF' AS message;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Commentaire
COMMENT ON FUNCTION public.check_voyage_photos_bucket() IS 'Vérifie si le bucket voyage-photos existe';

-- ====================================
-- POLICIES POUR LE BUCKET (AUTOMATIQUES)
-- ====================================

-- Les policies sont créées automatiquement par la migration 014.
-- Ne les créez PAS manuellement.

-- Migration 014 créera automatiquement:
-- ✅ INSERT  - Upload de photos (auth.uid() requis)
-- ✅ SELECT  - Téléchargement (uniquement SES photos)
-- ✅ UPDATE  - Modification métadonnées (uniquement SES photos)
-- ✅ DELETE  - Suppression (uniquement SES photos)

-- Ordre d'exécution:
-- 1. Exécutez script 47 (création du bucket)
-- 2. Exécutez migration 014 (création des policies)

-- Vérification après migration 014:
-- SELECT * FROM public.check_voyage_photos_policies();

-- ====================================
-- VÉRIFICATION
-- ====================================

-- Exécuter cette fonction pour voir les instructions
SELECT public.check_voyage_photos_bucket();
