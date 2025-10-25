-- =====================================================
-- 🚨 FIX CRITIQUE: RÉCURSION INFINIE RLS
-- =====================================================
-- Correction de l'erreur: infinite recursion detected in policy for relation "investors"
-- Date: 2025-10-25
-- Cause: Les policies RLS sur investors font des SELECT sur investors, créant une boucle infinie

-- 1. Créer fonction helper SECURITY DEFINER pour bypasser RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM investors
    WHERE user_id = auth.uid()
    AND access_level = 'admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Vérifie si l''utilisateur actuel est admin (SECURITY DEFINER pour éviter récursion RLS)';

CREATE OR REPLACE FUNCTION public.get_current_investor_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT id FROM investors
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION public.get_current_investor_id() IS 'Retourne l''ID de l''investisseur actuel (SECURITY DEFINER pour éviter récursion RLS)';

-- 2. Supprimer toutes les policies existantes sur investors
-- =====================================================

DROP POLICY IF EXISTS "Users read own data or admin reads all" ON investors;
DROP POLICY IF EXISTS "Only admins can create investors" ON investors;
DROP POLICY IF EXISTS "Users update own data" ON investors;
DROP POLICY IF EXISTS "Admins update any investor" ON investors;
DROP POLICY IF EXISTS "Only admins can delete investors" ON investors;

-- 3. Recréer les policies en utilisant is_admin()
-- =====================================================

-- Policy READ: Les utilisateurs peuvent voir leurs propres données OU les admins voient tout
CREATE POLICY "Users read own data or admin reads all"
ON investors FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  is_admin()
);

-- Policy INSERT: Seulement les admins peuvent créer des investisseurs
CREATE POLICY "Only admins can create investors"
ON investors FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
);

-- Policy UPDATE: Les utilisateurs peuvent modifier leurs propres données
CREATE POLICY "Users update own data"
ON investors FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy UPDATE ADMIN: Les admins peuvent tout modifier
CREATE POLICY "Admins update any investor"
ON investors FOR UPDATE
TO authenticated
USING (
  is_admin()
)
WITH CHECK (
  is_admin()
);

-- Policy DELETE: Seulement les admins peuvent supprimer
CREATE POLICY "Only admins can delete investors"
ON investors FOR DELETE
TO authenticated
USING (
  is_admin()
);

-- 4. Mettre à jour les policies des autres tables
-- =====================================================

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users read own transactions or admin reads all" ON transactions;
DROP POLICY IF EXISTS "Users insert own transactions or admin inserts any" ON transactions;
DROP POLICY IF EXISTS "Users update own transactions or admin updates any" ON transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;

CREATE POLICY "Users read own transactions or admin reads all"
ON transactions FOR SELECT
TO authenticated
USING (
  investor_id = get_current_investor_id()
  OR
  is_admin()
);

CREATE POLICY "Users insert own transactions or admin inserts any"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (
  investor_id = get_current_investor_id()
  OR
  is_admin()
);

CREATE POLICY "Users update own transactions or admin updates any"
ON transactions FOR UPDATE
TO authenticated
USING (
  investor_id = get_current_investor_id()
  OR
  is_admin()
);

CREATE POLICY "Only admins can delete transactions"
ON transactions FOR DELETE
TO authenticated
USING (
  is_admin()
);

-- PROPERTIES
DROP POLICY IF EXISTS "Only admins manage properties" ON properties;

CREATE POLICY "Only admins manage properties"
ON properties FOR ALL
TO authenticated
USING (
  is_admin()
)
WITH CHECK (
  is_admin()
);

-- DOCUMENTS
DROP POLICY IF EXISTS "Users read own documents or admin reads all" ON documents;
DROP POLICY IF EXISTS "Users insert own documents" ON documents;
DROP POLICY IF EXISTS "Users delete own documents or admin deletes any" ON documents;

CREATE POLICY "Users read own documents or admin reads all"
ON documents FOR SELECT
TO authenticated
USING (
  uploaded_by = get_current_investor_id()
  OR
  is_admin()
);

CREATE POLICY "Users insert own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = get_current_investor_id()
  OR
  is_admin()
);

CREATE POLICY "Users delete own documents or admin deletes any"
ON documents FOR DELETE
TO authenticated
USING (
  uploaded_by = get_current_investor_id()
  OR
  is_admin()
);

-- DIVIDEND_ALLOCATIONS
DROP POLICY IF EXISTS "Users read own allocations or admin reads all" ON dividend_allocations;
DROP POLICY IF EXISTS "Only admins manage allocations" ON dividend_allocations;

CREATE POLICY "Users read own allocations or admin reads all"
ON dividend_allocations FOR SELECT
TO authenticated
USING (
  investor_id = get_current_investor_id()
  OR
  is_admin()
);

CREATE POLICY "Only admins manage allocations"
ON dividend_allocations FOR ALL
TO authenticated
USING (
  is_admin()
)
WITH CHECK (
  is_admin()
);

-- Toutes les autres tables avec admin-only policies
DROP POLICY IF EXISTS "Only admins manage dividends" ON dividends;
DROP POLICY IF EXISTS "Only admins manage capex" ON capex_accounts;
DROP POLICY IF EXISTS "Only admins manage current" ON current_accounts;
DROP POLICY IF EXISTS "Only admins manage rnd" ON rnd_accounts;
DROP POLICY IF EXISTS "Only admins manage expenses" ON operational_expenses;
DROP POLICY IF EXISTS "Only admins manage reports" ON reports;
DROP POLICY IF EXISTS "Only admins manage corporate book" ON corporate_book;
DROP POLICY IF EXISTS "Only admins manage corporate book documents" ON corporate_book_documents;

CREATE POLICY "Only admins manage dividends"
ON dividends FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins manage capex"
ON capex_accounts FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins manage current"
ON current_accounts FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins manage rnd"
ON rnd_accounts FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins manage expenses"
ON operational_expenses FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins manage reports"
ON reports FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins manage corporate book"
ON corporate_book FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins manage corporate book documents"
ON corporate_book_documents FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 5. Mettre à jour le trigger de protection
-- =====================================================

CREATE OR REPLACE FUNCTION protect_investor_sensitive_fields()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Utiliser la fonction is_admin() au lieu de SELECT direct
  is_admin_user := is_admin();

  -- Si pas admin et tentative de modification des champs sensibles
  IF NOT is_admin_user THEN
    -- Empêcher modification de access_level
    IF NEW.access_level IS DISTINCT FROM OLD.access_level THEN
      RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier access_level';
    END IF;

    -- Empêcher modification de user_id
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Impossible de modifier user_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ RÉCURSION RLS CORRIGÉE AVEC SUCCÈS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  ✓ is_admin() - SECURITY DEFINER';
  RAISE NOTICE '  ✓ get_current_investor_id() - SECURITY DEFINER';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies mises à jour pour utiliser ces fonctions';
  RAISE NOTICE 'Plus de récursion infinie!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
