-- =====================================================
-- SCRIPT 45: AJOUT DE LA PHOTO PRINCIPALE AUX PROPRIÉTÉS
--
-- Ce script ajoute la colonne main_photo_url à la table properties
-- pour permettre de transférer automatiquement la photo principale
-- du scénario lors de la conversion en projet.
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- Ajouter la colonne main_photo_url
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS main_photo_url TEXT;

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN properties.main_photo_url IS
'URL de la photo principale de la propriété, transférée depuis le scénario lors de la conversion';

-- Message de confirmation
SELECT 'MIGRATION 45 TERMINEE - Colonne main_photo_url ajoutée à properties' AS status;
