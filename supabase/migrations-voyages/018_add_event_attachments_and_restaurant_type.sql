-- Migration 018: Ajouter support pour pièces jointes et type restaurant
-- Description: Ajoute une colonne pour les pièces jointes (PDFs, billets) et ajoute 'restaurant' aux types

-- 1. Ajouter 'restaurant' aux types d'événements autorisés
ALTER TABLE public.evenements
DROP CONSTRAINT IF EXISTS evenements_type_check;

ALTER TABLE public.evenements
ADD CONSTRAINT evenements_type_check CHECK (type IN ('vol', 'hebergement', 'activite', 'transport', 'condo', 'restaurant'));

-- 2. Ajouter la colonne attachments (array de chemins vers les fichiers dans Supabase Storage)
ALTER TABLE public.evenements
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Commentaire
COMMENT ON COLUMN public.evenements.attachments IS 'Pièces jointes (PDFs, billets, etc.) stockées dans Supabase Storage. Format: [{"url": "...", "name": "...", "type": "..."}]';

-- 3. Créer un index pour améliorer les performances lors de la recherche d'événements avec attachments
CREATE INDEX IF NOT EXISTS idx_evenements_has_attachments ON public.evenements((jsonb_array_length(attachments) > 0));
