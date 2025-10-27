-- Migration 012: Création des fonctions utilitaires
-- Description: Fonctions pour automatisation et helpers

-- ====================================
-- FONCTION: Mettre à jour updated_at automatiquement
-- ====================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.handle_updated_at() IS 'Met à jour automatiquement le champ updated_at lors d''une modification';

-- ====================================
-- TRIGGER: Appliquer handle_updated_at sur voyages
-- ====================================

CREATE TRIGGER set_updated_at_voyages
  BEFORE UPDATE ON public.voyages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ====================================
-- FONCTION: Générer un lien de partage unique
-- ====================================

CREATE OR REPLACE FUNCTION public.generate_share_link()
RETURNS TEXT AS $$
DECLARE
  random_string TEXT;
BEGIN
  -- Générer une chaîne aléatoire de 12 caractères
  random_string := encode(gen_random_bytes(9), 'base64');
  -- Nettoyer les caractères non alphanumériques
  random_string := translate(random_string, '+/=', 'abc');

  RETURN 'https://cerdia.com/voyage/share/' || random_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.generate_share_link() IS 'Génère un lien de partage unique pour un voyage';

-- ====================================
-- FONCTION: Vérifier si un voyage est expiré
-- ====================================

CREATE OR REPLACE FUNCTION public.is_voyage_expired(voyage_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiration_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT expire_at INTO expiration_date
  FROM public.voyages
  WHERE id = voyage_id_param;

  IF expiration_date IS NULL THEN
    RETURN FALSE; -- Pas d'expiration = jamais expiré
  END IF;

  RETURN expiration_date < TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.is_voyage_expired(UUID) IS 'Vérifie si un voyage a expiré (mode single 6 mois)';

-- ====================================
-- FONCTION: Compter les voyages d'un utilisateur
-- ====================================

CREATE OR REPLACE FUNCTION public.count_user_voyages(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  voyage_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO voyage_count
  FROM public.voyages
  WHERE user_id = user_id_param;

  RETURN voyage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.count_user_voyages(UUID) IS 'Compte le nombre de voyages d''un utilisateur (pour limitation mode single)';
