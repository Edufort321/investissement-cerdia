-- =====================================================
-- SCRIPT 24: AJOUT DES CHAMPS LOCALISATION ET CONTACTS AUX SCÉNARIOS
-- =====================================================
-- Description: Ajoute les champs de localisation et contacts (promoteur, courtier, compagnie)
-- Dépendances: Script 20 (table scenarios)
-- =====================================================

-- Ajouter les colonnes de localisation
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS unit_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state_region TEXT,
ADD COLUMN IF NOT EXISTS promoter_name TEXT,
ADD COLUMN IF NOT EXISTS broker_name TEXT,
ADD COLUMN IF NOT EXISTS broker_email TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Ajouter des commentaires sur les colonnes
COMMENT ON COLUMN scenarios.unit_number IS 'Numéro d''unité (condo ou appartement)';
COMMENT ON COLUMN scenarios.address IS 'Adresse complète du projet (optionnel)';
COMMENT ON COLUMN scenarios.country IS 'Pays du projet';
COMMENT ON COLUMN scenarios.state_region IS 'État/Région/Province du projet';
COMMENT ON COLUMN scenarios.promoter_name IS 'Nom du promoteur';
COMMENT ON COLUMN scenarios.broker_name IS 'Nom du courtier';
COMMENT ON COLUMN scenarios.broker_email IS 'Adresse courriel du courtier';
COMMENT ON COLUMN scenarios.company_name IS 'Nom de la compagnie';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 24: LOCALISATION ET CONTACTS AJOUTÉS AUX SCÉNARIOS';
  RAISE NOTICE '';
  RAISE NOTICE 'Modifications apportées:';
  RAISE NOTICE '  - Colonne unit_number ajoutée à scenarios';
  RAISE NOTICE '  - Colonne address ajoutée à scenarios';
  RAISE NOTICE '  - Colonne country ajoutée à scenarios';
  RAISE NOTICE '  - Colonne state_region ajoutée à scenarios';
  RAISE NOTICE '  - Colonne promoter_name ajoutée à scenarios';
  RAISE NOTICE '  - Colonne broker_name ajoutée à scenarios';
  RAISE NOTICE '  - Colonne broker_email ajoutée à scenarios';
  RAISE NOTICE '  - Colonne company_name ajoutée à scenarios';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Tous ces champs sont optionnels (sauf nom du projet)';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Prêt à saisir les informations complètes';
END $$;
