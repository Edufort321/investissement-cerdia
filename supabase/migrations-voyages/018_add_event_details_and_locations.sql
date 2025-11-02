-- Migration 018: Ajout des champs détaillés pour événements
-- Description: Ajouter adresses départ/arrivée, coordonnées GPS, infos vol, ordre optimisé

-- Ajouter les colonnes manquantes à la table evenements
ALTER TABLE public.evenements
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS coordonnees JSONB, -- {lat: number, lng: number}
  ADD COLUMN IF NOT EXISTS ville_depart TEXT,
  ADD COLUMN IF NOT EXISTS ville_arrivee TEXT,
  ADD COLUMN IF NOT EXISTS numero_vol TEXT,
  ADD COLUMN IF NOT EXISTS compagnie TEXT,
  ADD COLUMN IF NOT EXISTS heure_arrivee TIME,
  ADD COLUMN IF NOT EXISTS date_arrivee DATE,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT CHECK (transport_mode IN ('plane', 'train', 'car', 'bus', 'bike', 'walk', 'boat')),
  ADD COLUMN IF NOT EXISTS duration INTEGER, -- Durée en minutes
  ADD COLUMN IF NOT EXISTS from_location TEXT, -- Point de départ
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0; -- Ordre dans la timeline (pour optimisation)

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_evenements_ordre ON public.evenements(voyage_id, ordre);
CREATE INDEX IF NOT EXISTS idx_evenements_date ON public.evenements(voyage_id, date, heure_debut);

-- Commentaires
COMMENT ON COLUMN public.evenements.adresse IS 'Adresse complète de l''événement';
COMMENT ON COLUMN public.evenements.coordonnees IS 'Coordonnées GPS au format JSON {lat, lng}';
COMMENT ON COLUMN public.evenements.ville_depart IS 'Ville de départ (pour vols et transports)';
COMMENT ON COLUMN public.evenements.ville_arrivee IS 'Ville d''arrivée (pour vols et transports)';
COMMENT ON COLUMN public.evenements.numero_vol IS 'Numéro de vol (ex: AC123)';
COMMENT ON COLUMN public.evenements.compagnie IS 'Compagnie aérienne ou de transport';
COMMENT ON COLUMN public.evenements.heure_arrivee IS 'Heure d''arrivée locale à destination';
COMMENT ON COLUMN public.evenements.date_arrivee IS 'Date d''arrivée (peut être différente pour vols longs)';
COMMENT ON COLUMN public.evenements.transport_mode IS 'Mode de transport spécifique pour affichage carte';
COMMENT ON COLUMN public.evenements.duration IS 'Durée estimée en minutes';
COMMENT ON COLUMN public.evenements.from_location IS 'Lieu de départ pour les transports';
COMMENT ON COLUMN public.evenements.rating IS 'Note de l''utilisateur (1-5 étoiles)';
COMMENT ON COLUMN public.evenements.ordre IS 'Ordre dans la timeline après optimisation';

-- Mettre à jour les événements existants avec un ordre basé sur la date
UPDATE public.evenements
SET ordre = subquery.row_num
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY voyage_id ORDER BY date, COALESCE(heure_debut, '00:00:00')) as row_num
  FROM public.evenements
) AS subquery
WHERE evenements.id = subquery.id;
