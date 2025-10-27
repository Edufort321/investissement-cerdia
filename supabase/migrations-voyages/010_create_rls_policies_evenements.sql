-- Migration 010: Politiques RLS pour la table evenements
-- Description: Définit les règles de sécurité pour l'accès aux événements

-- ====================================
-- POLICIES POUR EVENEMENTS
-- ====================================

-- SELECT: Les utilisateurs peuvent voir les événements de leurs voyages
CREATE POLICY "Users can view events from their voyages"
  ON public.evenements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- INSERT: Les utilisateurs peuvent créer des événements dans leurs voyages
CREATE POLICY "Users can create events in their voyages"
  ON public.evenements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- UPDATE: Les utilisateurs peuvent modifier les événements de leurs voyages
CREATE POLICY "Users can update events from their voyages"
  ON public.evenements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- DELETE: Les utilisateurs peuvent supprimer les événements de leurs voyages
CREATE POLICY "Users can delete events from their voyages"
  ON public.evenements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );
