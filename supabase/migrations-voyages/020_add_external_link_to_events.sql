-- Migration 020: Ajout du champ external_link aux événements
-- Description: Permet de stocker un lien vers une application/site web lié à l'événement
-- (ex: lien de réservation, billetterie, site de l'événement, etc.)

ALTER TABLE public.evenements
ADD COLUMN IF NOT EXISTS external_link TEXT;

-- Commentaire
COMMENT ON COLUMN public.evenements.external_link IS 'Lien externe vers une application ou site web lié à l''événement (réservation, billetterie, etc.)';
