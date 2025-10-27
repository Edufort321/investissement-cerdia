-- Migration 005: Création de la table photos
-- Description: Table pour les métadonnées des photos uploadées (fichiers dans Supabase Storage)

CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  evenement_id UUID REFERENCES public.evenements(id) ON DELETE CASCADE,
  depense_id UUID REFERENCES public.depenses(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Chemin dans Supabase Storage bucket 'voyage-photos'
  nom_fichier TEXT NOT NULL,
  taille INTEGER,
  type_mime TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Une photo peut être liée soit à un événement, soit à une dépense, soit au voyage directement
  CONSTRAINT photo_lien_unique CHECK (
    (evenement_id IS NOT NULL AND depense_id IS NULL) OR
    (evenement_id IS NULL AND depense_id IS NOT NULL) OR
    (evenement_id IS NULL AND depense_id IS NULL)
  )
);

-- Commentaires
COMMENT ON TABLE public.photos IS 'Métadonnées des photos uploadées dans Supabase Storage';
COMMENT ON COLUMN public.photos.storage_path IS 'Chemin du fichier dans le bucket voyage-photos';
COMMENT ON COLUMN public.photos.evenement_id IS 'Lien vers un événement (optionnel)';
COMMENT ON COLUMN public.photos.depense_id IS 'Lien vers une dépense (optionnel)';
COMMENT ON COLUMN public.photos.voyage_id IS 'Référence au voyage parent';
