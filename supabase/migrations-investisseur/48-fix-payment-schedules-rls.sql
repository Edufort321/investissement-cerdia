-- =====================================================
-- SCRIPT 48: FIX RLS POUR PAYMENT_SCHEDULES
--
-- Problème: Seuls les admins peuvent insérer des payment_schedules
-- Solution: Permettre aux utilisateurs authentifiés d'insérer
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- Supprimer l'ancienne policy restrictive "ALL" pour admins
DROP POLICY IF EXISTS "Admin peut tout modifier sur payment_schedules" ON payment_schedules;

-- Recréer les policies plus granulaires

-- 1. SELECT: Admins peuvent tout voir
-- (Cette policy existe déjà, on la garde)

-- 2. INSERT: Utilisateurs authentifiés peuvent insérer
CREATE POLICY "Authenticated users can insert payment_schedules"
ON payment_schedules FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. UPDATE: Admins peuvent modifier
CREATE POLICY "Admin can update payment_schedules"
ON payment_schedules FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- 4. DELETE: Admins peuvent supprimer
CREATE POLICY "Admin can delete payment_schedules"
ON payment_schedules FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister toutes les policies sur payment_schedules
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'payment_schedules'
ORDER BY cmd, policyname;

-- Message de confirmation
SELECT '✅ MIGRATION 48 TERMINEE - RLS payment_schedules corrigé' AS status;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 POLICIES PAYMENT_SCHEDULES:';
  RAISE NOTICE '';
  RAISE NOTICE '✅ SELECT: Admins seulement';
  RAISE NOTICE '✅ INSERT: Tous les utilisateurs authentifiés';
  RAISE NOTICE '✅ UPDATE: Admins seulement';
  RAISE NOTICE '✅ DELETE: Admins seulement';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Problème résolu: Les payment_schedules peuvent maintenant';
  RAISE NOTICE '   être créés lors de la conversion scénario → projet';
  RAISE NOTICE '';
END $$;
