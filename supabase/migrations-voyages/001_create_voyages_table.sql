-- Migration 001: Création de la table voyages
-- Description: Table principale pour stocker les informations des voyages

CREATE TABLE IF NOT EXISTS public.voyages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  budget DECIMAL(10, 2),
  devise TEXT DEFAULT 'CAD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Métadonnées de l'abonnement
  mode_achat TEXT CHECK (mode_achat IN ('investor', 'single', 'full')),
  expire_at TIMESTAMP WITH TIME ZONE, -- Pour mode 'single' (6 mois)

  -- Contraintes
  CONSTRAINT budget_positive CHECK (budget >= 0),
  CONSTRAINT dates_valides CHECK (date_fin >= date_debut)
);

-- Commentaires
COMMENT ON TABLE public.voyages IS 'Table principale des voyages créés par les utilisateurs';
COMMENT ON COLUMN public.voyages.user_id IS 'Référence à l''utilisateur propriétaire du voyage';
COMMENT ON COLUMN public.voyages.mode_achat IS 'Mode d''achat: investor (gratuit investisseur), single (5$ CAD), full (15$ CAD)';
COMMENT ON COLUMN public.voyages.expire_at IS 'Date d''expiration pour le mode single (6 mois)';
