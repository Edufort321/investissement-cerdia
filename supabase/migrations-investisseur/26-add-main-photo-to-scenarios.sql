-- =====================================================
-- SCRIPT 26: AJOUT PHOTO PRINCIPALE AUX SCÉNARIOS
-- =====================================================
-- Description: Ajoute le champ main_photo_url pour la photo principale du projet
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- Ajouter la colonne main_photo_url
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS main_photo_url TEXT;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN scenarios.main_photo_url IS 'URL de la photo principale du projet (affichée à gauche du titre)';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 26: PHOTO PRINCIPALE AJOUTÉE AUX SCÉNARIOS';
  RAISE NOTICE '';
  RAISE NOTICE 'Modifications apportées:';
  RAISE NOTICE '  - Colonne main_photo_url (TEXT) ajoutée à scenarios';
  RAISE NOTICE '';
  RAISE NOTICE '📸 Cette photo sera affichée à gauche du titre du projet';
  RAISE NOTICE '✓ Support du drag & drop et prise de photo mobile';
END $$;
