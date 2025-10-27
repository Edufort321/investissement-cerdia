-- =====================================================
-- Migration 016: Correction de la récursion infinie RLS
-- =====================================================
-- Description: Supprime et recrée proprement toutes les policies RLS
--              pour éviter les duplications et récursions infinies
-- Date: 2025-10-26
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER TOUTES LES POLICIES EXISTANTES
-- =====================================================

-- Policies voyages
DROP POLICY IF EXISTS "Users can view their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Users can create their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Users can update their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Users can delete their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Anyone can view public voyages" ON public.voyages;

-- Policies evenements
DROP POLICY IF EXISTS "Users can view events of their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Users can create events in their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Users can update events of their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Users can delete events of their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Anyone can view events of public voyages" ON public.evenements;

-- Policies depenses
DROP POLICY IF EXISTS "RLS depenses SELECT" ON public.depenses;
DROP POLICY IF EXISTS "RLS depenses INSERT" ON public.depenses;
DROP POLICY IF EXISTS "RLS depenses UPDATE" ON public.depenses;
DROP POLICY IF EXISTS "RLS depenses DELETE" ON public.depenses;
DROP POLICY IF EXISTS "Anyone can view depenses of public voyages" ON public.depenses;

-- Policies checklist
DROP POLICY IF EXISTS "RLS checklist SELECT" ON public.checklist;
DROP POLICY IF EXISTS "RLS checklist INSERT" ON public.checklist;
DROP POLICY IF EXISTS "RLS checklist UPDATE" ON public.checklist;
DROP POLICY IF EXISTS "RLS checklist DELETE" ON public.checklist;
DROP POLICY IF EXISTS "Anyone can view checklist of public voyages" ON public.checklist;

-- Policies photos
DROP POLICY IF EXISTS "RLS photos SELECT" ON public.photos;
DROP POLICY IF EXISTS "RLS photos INSERT" ON public.photos;
DROP POLICY IF EXISTS "RLS photos DELETE" ON public.photos;
DROP POLICY IF EXISTS "Anyone can view public photos" ON public.photos;

-- Policies partage
DROP POLICY IF EXISTS "RLS partage SELECT" ON public.partage;
DROP POLICY IF EXISTS "RLS partage INSERT" ON public.partage;
DROP POLICY IF EXISTS "RLS partage UPDATE" ON public.partage;

-- =====================================================
-- 2. RECRÉER LES POLICIES PROPREMENT - VOYAGES
-- =====================================================

-- SELECT: Utilisateurs voient leurs propres voyages OU voyages publics
CREATE POLICY "voyages_select_policy" ON public.voyages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_public = true
  );

-- INSERT: Utilisateurs créent leurs propres voyages
CREATE POLICY "voyages_insert_policy" ON public.voyages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Utilisateurs modifient leurs propres voyages
CREATE POLICY "voyages_update_policy" ON public.voyages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Utilisateurs suppriment leurs propres voyages
CREATE POLICY "voyages_delete_policy" ON public.voyages
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. RECRÉER LES POLICIES - EVENEMENTS
-- =====================================================

CREATE POLICY "evenements_select_policy" ON public.evenements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND (voyages.user_id = auth.uid() OR voyages.is_public = true)
    )
  );

CREATE POLICY "evenements_insert_policy" ON public.evenements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_update_policy" ON public.evenements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_delete_policy" ON public.evenements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. RECRÉER LES POLICIES - DEPENSES
-- =====================================================

CREATE POLICY "depenses_select_policy" ON public.depenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND (voyages.user_id = auth.uid() OR voyages.is_public = true)
    )
  );

CREATE POLICY "depenses_insert_policy" ON public.depenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_update_policy" ON public.depenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_delete_policy" ON public.depenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. RECRÉER LES POLICIES - CHECKLIST
-- =====================================================

CREATE POLICY "checklist_select_policy" ON public.checklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND (voyages.user_id = auth.uid() OR voyages.is_public = true)
    )
  );

CREATE POLICY "checklist_insert_policy" ON public.checklist
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_update_policy" ON public.checklist
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_delete_policy" ON public.checklist
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. RECRÉER LES POLICIES - PHOTOS
-- =====================================================

CREATE POLICY "photos_select_policy" ON public.photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = photos.voyage_id
      AND (
        voyages.user_id = auth.uid()
        OR (voyages.is_public = true AND photos.show_in_public = true)
      )
    )
  );

CREATE POLICY "photos_insert_policy" ON public.photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = photos.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "photos_delete_policy" ON public.photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = photos.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. RECRÉER LES POLICIES - PARTAGE
-- =====================================================

CREATE POLICY "partage_select_policy" ON public.partage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = partage.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "partage_insert_policy" ON public.partage
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = partage.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "partage_update_policy" ON public.partage
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = partage.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 016 TERMINÉE: RLS policies nettoyées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Toutes les policies ont été supprimées et recréées';
  RAISE NOTICE '✓ Plus de récursion infinie';
  RAISE NOTICE '✓ Policies simplifiées avec noms uniques';
  RAISE NOTICE '';
END $$;
