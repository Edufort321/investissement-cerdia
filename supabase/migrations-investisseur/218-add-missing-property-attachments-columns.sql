-- Migration 218 : Colonnes manquantes sur property_attachments (file_type, description)
-- =====================================================================
-- BUG : « Erreur lors du téléchargement … : Could not find the 'description'
--   column of 'property_attachments' in the schema cache » à l'ajout d'une
--   pièce jointe de propriété.
--
-- CAUSE : la table live property_attachments ne possède PAS les colonnes
--   file_type et description (la mig.11 qui les définit n'a pas été appliquée
--   intégralement, ou la table a été recréée sans elles lors du rollout
--   multitenant). Or components/ProjectAttachments.tsx insère file_type ET
--   description → l'INSERT échoue sur la première colonne absente.
--
-- CORRECTIF : ajouter les 2 colonnes (idempotent) pour aligner le schéma sur
--   la définition d'origine (mig.11) et sur le code, puis recharger le cache
--   PostgREST.
-- =====================================================================

ALTER TABLE property_attachments
  ADD COLUMN IF NOT EXISTS file_type   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN property_attachments.file_type   IS 'Type MIME du fichier';
COMMENT ON COLUMN property_attachments.description IS 'Description / note optionnelle de la pièce jointe';

-- Recharge le cache de schéma PostgREST (sinon l''API peut ignorer les colonnes
-- jusqu''au prochain reload automatique).
NOTIFY pgrst, 'reload schema';

-- ─── Vérification ────────────────────────────────────────────────────────────
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_attachments'
  AND column_name IN ('file_type', 'description')
ORDER BY column_name;
