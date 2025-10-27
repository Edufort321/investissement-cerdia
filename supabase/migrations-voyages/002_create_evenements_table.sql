-- Migration 002: Création de la table evenements
-- Description: Table pour les événements du timeline (vols, hébergements, activités, etc.)

CREATE TABLE IF NOT EXISTS public.evenements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vol', 'hebergement', 'activite', 'transport', 'condo')),
  titre TEXT NOT NULL,
  date DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  lieu TEXT,
  prix DECIMAL(10, 2),
  devise TEXT DEFAULT 'CAD',
  notes TEXT,
  transport TEXT, -- Type de transport si applicable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Contraintes
  CONSTRAINT prix_positive CHECK (prix >= 0),
  CONSTRAINT heures_valides CHECK (heure_fin IS NULL OR heure_debut IS NULL OR heure_fin >= heure_debut)
);

-- Commentaires
COMMENT ON TABLE public.evenements IS 'Événements de la timeline du voyage';
COMMENT ON COLUMN public.evenements.type IS 'Type d''événement: vol, hebergement, activite, transport, condo';
COMMENT ON COLUMN public.evenements.voyage_id IS 'Référence au voyage parent';
COMMENT ON COLUMN public.evenements.transport IS 'Mode de transport (avion, train, voiture, etc.)';
