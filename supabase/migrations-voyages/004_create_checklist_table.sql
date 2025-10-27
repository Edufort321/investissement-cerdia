-- Migration 004: Création de la table checklist
-- Description: Table pour la checklist des tâches à faire pour le voyage

CREATE TABLE IF NOT EXISTS public.checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,
  complete BOOLEAN DEFAULT FALSE,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Commentaires
COMMENT ON TABLE public.checklist IS 'Items de la checklist pour préparer le voyage';
COMMENT ON COLUMN public.checklist.ordre IS 'Ordre d''affichage des items (pour drag & drop)';
COMMENT ON COLUMN public.checklist.complete IS 'État de complétion de l''item';
COMMENT ON COLUMN public.checklist.voyage_id IS 'Référence au voyage parent';
