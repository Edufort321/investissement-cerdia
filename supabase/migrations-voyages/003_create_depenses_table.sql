-- Migration 003: Création de la table depenses
-- Description: Table pour le suivi des dépenses du voyage

CREATE TABLE IF NOT EXISTS public.depenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  categorie TEXT NOT NULL,
  description TEXT,
  montant DECIMAL(10, 2) NOT NULL,
  devise TEXT DEFAULT 'CAD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Contraintes
  CONSTRAINT montant_positive CHECK (montant >= 0)
);

-- Commentaires
COMMENT ON TABLE public.depenses IS 'Dépenses effectuées pendant le voyage';
COMMENT ON COLUMN public.depenses.categorie IS 'Catégorie de dépense: restaurant, transport, hébergement, activité, shopping, etc.';
COMMENT ON COLUMN public.depenses.voyage_id IS 'Référence au voyage parent';
