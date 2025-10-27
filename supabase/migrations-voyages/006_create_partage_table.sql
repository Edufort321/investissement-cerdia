-- Migration 006: Création de la table partage
-- Description: Table pour la fonctionnalité "Me Suivre" (partage du voyage en temps réel)

CREATE TABLE IF NOT EXISTS public.partage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  actif BOOLEAN DEFAULT FALSE,
  lien_partage TEXT UNIQUE NOT NULL,
  en_direct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Un voyage ne peut avoir qu'un seul lien de partage
  CONSTRAINT unique_voyage_partage UNIQUE (voyage_id)
);

-- Commentaires
COMMENT ON TABLE public.partage IS 'Configuration de partage "Me Suivre" pour les voyages';
COMMENT ON COLUMN public.partage.actif IS 'Indique si le partage est activé';
COMMENT ON COLUMN public.partage.lien_partage IS 'Lien unique de partage du voyage';
COMMENT ON COLUMN public.partage.en_direct IS 'Mode suivi en temps réel activé';
COMMENT ON COLUMN public.partage.voyage_id IS 'Référence au voyage partagé';
