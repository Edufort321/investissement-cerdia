-- Migration 009: Politiques RLS pour la table voyages
-- Description: Définit les règles de sécurité pour l'accès aux voyages

-- ====================================
-- POLICIES POUR VOYAGES
-- ====================================

-- SELECT: Les utilisateurs peuvent voir leurs propres voyages
CREATE POLICY "Users can view their own voyages"
  ON public.voyages
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Les utilisateurs peuvent créer leurs propres voyages
CREATE POLICY "Users can create their own voyages"
  ON public.voyages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Les utilisateurs peuvent modifier leurs propres voyages
CREATE POLICY "Users can update their own voyages"
  ON public.voyages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Les utilisateurs peuvent supprimer leurs propres voyages
CREATE POLICY "Users can delete their own voyages"
  ON public.voyages
  FOR DELETE
  USING (auth.uid() = user_id);
