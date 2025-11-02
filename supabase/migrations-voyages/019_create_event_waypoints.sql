-- Migration 019: Création de la table event_waypoints
-- Description: Points d'intérêt / étapes lors d'un événement (ex: promenade, visite guidée)

CREATE TABLE IF NOT EXISTS public.event_waypoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evenement_id UUID NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  coordonnees JSONB NOT NULL, -- {lat: number, lng: number}
  adresse TEXT,
  photo_url TEXT,
  visited BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Contraintes
  CONSTRAINT ordre_positive CHECK (ordre >= 0)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_waypoints_evenement ON public.event_waypoints(evenement_id, ordre);

-- Commentaires
COMMENT ON TABLE public.event_waypoints IS 'Points d''intérêt / étapes lors d''un événement (promenade, visite)';
COMMENT ON COLUMN public.event_waypoints.evenement_id IS 'Référence à l''événement parent';
COMMENT ON COLUMN public.event_waypoints.ordre IS 'Ordre de visite des points (1, 2, 3...)';
COMMENT ON COLUMN public.event_waypoints.coordonnees IS 'Coordonnées GPS du point au format {lat, lng}';
COMMENT ON COLUMN public.event_waypoints.visited IS 'Marque si le point a été visité';

-- ====================================
-- POLITIQUES RLS POUR EVENT_WAYPOINTS
-- ====================================

-- Les utilisateurs peuvent voir les waypoints de leurs événements
CREATE POLICY "Users can view waypoints from their events"
  ON public.event_waypoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent créer des waypoints dans leurs événements
CREATE POLICY "Users can create waypoints in their events"
  ON public.event_waypoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent mettre à jour les waypoints de leurs événements
CREATE POLICY "Users can update waypoints from their events"
  ON public.event_waypoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent supprimer les waypoints de leurs événements
CREATE POLICY "Users can delete waypoints from their events"
  ON public.event_waypoints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Politique publique: Les waypoints des événements partagés sont visibles
CREATE POLICY "Anyone can view waypoints from shared events"
  ON public.event_waypoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      JOIN public.partage ON partage.voyage_id = voyages.id
      WHERE evenements.id = event_waypoints.evenement_id
      AND partage.actif = TRUE
    )
  );
