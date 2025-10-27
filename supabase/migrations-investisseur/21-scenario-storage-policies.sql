-- =====================================================
-- SCRIPT 21: STORAGE POLICIES POUR SCÉNARIOS
-- =====================================================
-- Description: Configuration du bucket et policies pour les documents de scénarios
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- ⚠️ IMPORTANT: Créer d'abord le bucket manuellement dans Supabase Dashboard
--
-- Dashboard → Storage → Create Bucket
-- Nom: scenario-documents
-- Type: Privé (Private)
-- Limite de taille: 50 MB par fichier
-- Types autorisés: PDF, images, documents Office
--
-- =====================================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Authenticated users can upload scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update scenario documents" ON storage.objects;

-- =====================================================
-- POLICIES POUR LE BUCKET scenario-documents
-- =====================================================

-- 1. Upload (INSERT) - Tous les utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload scenario documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scenario-documents'
);

-- 2. View (SELECT) - Tous les utilisateurs authentifiés peuvent voir les documents
CREATE POLICY "Authenticated users can view scenario documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scenario-documents'
);

-- 3. Delete (DELETE) - Tous les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Authenticated users can delete scenario documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scenario-documents'
);

-- 4. Update (UPDATE) - Tous les utilisateurs authentifiés peuvent modifier
CREATE POLICY "Authenticated users can update scenario documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'scenario-documents'
);

-- =====================================================
-- STRUCTURE DES CHEMINS (RECOMMANDATION)
-- =====================================================

-- Format recommandé pour les chemins de fichiers:
-- scenario-documents/{scenario_id}/{filename}
--
-- Exemple:
-- scenario-documents/123e4567-e89b-12d3-a456-426614174000/brochure-promoteur.pdf
-- scenario-documents/123e4567-e89b-12d3-a456-426614174000/plan-financier.xlsx
-- scenario-documents/123e4567-e89b-12d3-a456-426614174000/photos/vue-1.jpg
--
-- Avantages:
-- - Organisation claire par scénario
-- - Facile de supprimer tous les fichiers d'un scénario
-- - Évite les collisions de noms

-- =====================================================
-- TYPES DE FICHIERS AUTORISÉS
-- =====================================================

-- Types MIME recommandés à accepter dans l'application:
-- - PDF: application/pdf
-- - Images: image/jpeg, image/png, image/gif, image/webp
-- - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
-- - Word: application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- - PowerPoint: application/vnd.openxmlformats-officedocument.presentationml.presentation

-- =====================================================
-- FONCTION HELPER POUR GÉNÉRER URL PUBLIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION get_scenario_document_url(
  scenario_uuid UUID,
  file_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  project_url TEXT;
BEGIN
  -- Récupérer l'URL du projet Supabase depuis les variables d'environnement
  SELECT current_setting('app.settings.supabase_url', true) INTO project_url;

  -- Si pas configuré, utiliser un placeholder
  IF project_url IS NULL THEN
    project_url := 'https://YOUR_PROJECT.supabase.co';
  END IF;

  -- Retourner l'URL complète
  RETURN project_url || '/storage/v1/object/public/scenario-documents/' ||
         scenario_uuid::TEXT || '/' || file_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 21: STORAGE POLICIES SCÉNARIOS CRÉÉES';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ACTION REQUISE:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Créer le bucket manuellement dans Supabase Dashboard:';
  RAISE NOTICE '   - Nom: scenario-documents';
  RAISE NOTICE '   - Type: Privé (Private)';
  RAISE NOTICE '   - Limite: 50 MB par fichier';
  RAISE NOTICE '';
  RAISE NOTICE '2. Types de fichiers recommandés:';
  RAISE NOTICE '   - PDF (brochures, plans)';
  RAISE NOTICE '   - Images (photos du projet)';
  RAISE NOTICE '   - Excel (tableaux financiers)';
  RAISE NOTICE '   - Word/PowerPoint (documentation)';
  RAISE NOTICE '';
  RAISE NOTICE '3. Structure des chemins:';
  RAISE NOTICE '   scenario-documents/{scenario_id}/{filename}';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies créées: Upload, View, Delete, Update ✓';
END $$;
