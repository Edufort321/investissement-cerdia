-- Migration 011: Politiques RLS pour depenses, checklist, photos, partage
-- Description: Définit les règles de sécurité pour les tables restantes

-- ====================================
-- POLICIES POUR DEPENSES
-- ====================================

CREATE POLICY "Users can view expenses from their voyages"
  ON public.depenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can create expenses in their voyages"
  ON public.depenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can update expenses from their voyages"
  ON public.depenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete expenses from their voyages"
  ON public.depenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICIES POUR CHECKLIST
-- ====================================

CREATE POLICY "Users can view checklist items from their voyages"
  ON public.checklist FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can create checklist items in their voyages"
  ON public.checklist FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can update checklist items from their voyages"
  ON public.checklist FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete checklist items from their voyages"
  ON public.checklist FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICIES POUR PHOTOS
-- ====================================

CREATE POLICY "Users can view photos from their voyages"
  ON public.photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can upload photos to their voyages"
  ON public.photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete photos from their voyages"
  ON public.photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICIES POUR PARTAGE
-- ====================================

CREATE POLICY "Users can view sharing settings from their voyages"
  ON public.partage FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can create sharing for their voyages"
  ON public.partage FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can update sharing settings for their voyages"
  ON public.partage FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete sharing for their voyages"
  ON public.partage FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICY PUBLIQUE POUR PARTAGE (lecture seule via lien)
-- ====================================

-- Permet à n'importe qui avec le lien de voir le voyage partagé
CREATE POLICY "Anyone can view shared voyages via link"
  ON public.voyages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partage
      WHERE partage.voyage_id = voyages.id
      AND partage.actif = TRUE
    )
  );

-- Permet la lecture publique des événements de voyages partagés
CREATE POLICY "Anyone can view events from shared voyages"
  ON public.evenements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partage
      JOIN public.voyages ON voyages.id = partage.voyage_id
      WHERE voyages.id = evenements.voyage_id
      AND partage.actif = TRUE
    )
  );
