-- =====================================================
-- Migration 017: Nettoyage FORCÉ de toutes les RLS policies
-- =====================================================
-- Description: Supprime TOUTES les policies RLS existantes de force
--              avant de recréer proprement
-- Date: 2025-10-26
-- =====================================================

-- =====================================================
-- 1. DÉSACTIVER TEMPORAIREMENT RLS (pour nettoyer)
-- =====================================================

ALTER TABLE public.voyages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partage DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. SUPPRIMER TOUTES LES POLICIES EXISTANTES - FORCE
-- =====================================================

-- Fonction pour supprimer toutes les policies d'une table
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Supprimer toutes les policies de la table voyages
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voyages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.voyages', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table evenements
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'evenements'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.evenements', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table depenses
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'depenses'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.depenses', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table checklist
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'checklist'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.checklist', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table photos
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'photos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.photos', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table partage
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'partage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.partage', pol.policyname);
  END LOOP;
END $$;

-- =====================================================
-- 3. RÉACTIVER RLS
-- =====================================================

ALTER TABLE public.voyages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CRÉER LES POLICIES - VOYAGES (simplifiées)
-- =====================================================

-- SELECT: voir ses propres voyages OU voyages publics
CREATE POLICY "voyages_select" ON public.voyages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_public = true
  );

-- INSERT: créer ses propres voyages
CREATE POLICY "voyages_insert" ON public.voyages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: modifier ses propres voyages
CREATE POLICY "voyages_update" ON public.voyages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: supprimer ses propres voyages
CREATE POLICY "voyages_delete" ON public.voyages
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. CRÉER LES POLICIES - EVENEMENTS
-- =====================================================

CREATE POLICY "evenements_select" ON public.evenements
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "evenements_insert" ON public.evenements
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_update" ON public.evenements
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_delete" ON public.evenements
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. CRÉER LES POLICIES - DEPENSES
-- =====================================================

CREATE POLICY "depenses_select" ON public.depenses
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "depenses_insert" ON public.depenses
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_update" ON public.depenses
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_delete" ON public.depenses
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. CRÉER LES POLICIES - CHECKLIST
-- =====================================================

CREATE POLICY "checklist_select" ON public.checklist
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "checklist_insert" ON public.checklist
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_update" ON public.checklist
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_delete" ON public.checklist
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. CRÉER LES POLICIES - PHOTOS
-- =====================================================

CREATE POLICY "photos_select" ON public.photos
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid()
      OR (is_public = true AND show_in_public = true)
    )
  );

CREATE POLICY "photos_insert" ON public.photos
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "photos_delete" ON public.photos
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. CRÉER LES POLICIES - PARTAGE
-- =====================================================

CREATE POLICY "partage_select" ON public.partage
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partage_insert" ON public.partage
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partage_update" ON public.partage
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 017 TERMINÉE: Nettoyage forcé RLS';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Toutes les policies ont été supprimées (force)';
  RAISE NOTICE '🔒 Nouvelles policies créées avec noms simplifiés';
  RAISE NOTICE '✓ Utilise IN au lieu de EXISTS pour éviter récursion';
  RAISE NOTICE '';
END $$;
