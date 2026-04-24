-- Migration 117: Fix trigger sync_share_value_to_investors
-- Le trigger dans migration 90-FINAL fait UPDATE investors SET ... sans WHERE clause,
-- ce qui cause l'erreur 21000 "UPDATE requires a WHERE clause" via RLS Supabase.
-- Fix: ajouter WHERE id IS NOT NULL + SECURITY DEFINER pour contourner RLS sur la table cible.

CREATE OR REPLACE FUNCTION sync_share_value_to_investors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- s'exécute en tant que propriétaire (postgres), bypass RLS
AS $$
DECLARE
  v_new_value DECIMAL(10, 4);
BEGIN
  IF NEW.setting_key = 'nominal_share_value' THEN
    v_new_value := NEW.setting_value::DECIMAL(10, 4);
    -- WHERE id IS NOT NULL évite le blocage RLS "UPDATE requires a WHERE clause"
    UPDATE investors
    SET share_value    = v_new_value,
        current_value  = total_shares * v_new_value,
        updated_at     = NOW()
    WHERE id IS NOT NULL;
    RAISE NOTICE '✅ Valeur nominale synchronisée vers investors: %', v_new_value;
  END IF;
  RETURN NEW;
END;
$$;

-- Recréer le trigger (inchangé)
DROP TRIGGER IF EXISTS auto_sync_share_value_to_investors ON company_settings;
CREATE TRIGGER auto_sync_share_value_to_investors
AFTER UPDATE ON company_settings
FOR EACH ROW
WHEN (OLD.setting_value IS DISTINCT FROM NEW.setting_value AND NEW.setting_key = 'nominal_share_value')
EXECUTE FUNCTION sync_share_value_to_investors();

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 117: trigger sync_share_value_to_investors corrigé (SECURITY DEFINER + WHERE id IS NOT NULL)';
END $$;
