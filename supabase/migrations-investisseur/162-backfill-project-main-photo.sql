-- =====================================================
-- MIGRATION 162: BACKFILL PHOTO PRINCIPALE DES PROJETS EXISTANTS
-- =====================================================
-- Contexte :
--   La photo principale (main_photo_url) saisie dans le formulaire de
--   scénario est transférée au projet lors de l'approbation. Les projets
--   convertis AVANT ce correctif n'ont pas hérité de la photo.
--
-- Action : copier main_photo_url depuis le scénario d'origine vers le
--   projet converti, uniquement quand le projet n'en a pas déjà une.
--
-- Le lien scénario -> projet : scenarios.converted_property_id = properties.id
-- =====================================================

UPDATE properties p
SET main_photo_url = s.main_photo_url
FROM scenarios s
WHERE s.converted_property_id = p.id
  AND s.main_photo_url IS NOT NULL
  AND s.main_photo_url <> ''
  AND (p.main_photo_url IS NULL OR p.main_photo_url = '');

-- Vérification
SELECT
  '✅ MIGRATION 162 — BACKFILL PHOTO PRINCIPALE' as status,
  COUNT(*) as projets_avec_photo
FROM properties
WHERE main_photo_url IS NOT NULL AND main_photo_url <> '';
