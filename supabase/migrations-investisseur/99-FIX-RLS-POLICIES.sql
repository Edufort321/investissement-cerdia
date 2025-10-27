-- =====================================================
-- SCRIPT DE CORRECTION RLS - SÉCURITÉ CRITIQUE
-- Remplace les policies "Allow all for authenticated"
-- par des policies restrictives basées sur user_id
-- Date: 2025-10-24
-- =====================================================

-- ⚠️ IMPORTANT: Exécuter ce script pour corriger les vulnérabilités de sécurité critiques
-- Les policies actuelles permettent à TOUS les utilisateurs authentifiés d'accéder à TOUTES les données

-- =====================================================
-- 1. INVESTORS TABLE
-- =====================================================

-- Supprimer les anciennes policies dangereuses
DROP POLICY IF EXISTS "Allow all for authenticated" ON investors;
DROP POLICY IF EXISTS "Allow authenticated users to read investors" ON investors;
DROP POLICY IF EXISTS "Allow authenticated users to insert investors" ON investors;
DROP POLICY IF EXISTS "Allow authenticated users to update investors" ON investors;
DROP POLICY IF EXISTS "Allow authenticated users to delete investors" ON investors;

-- Policy READ: Les utilisateurs peuvent voir leurs propres données OU les admins voient tout
CREATE POLICY "Users read own data or admin reads all"
ON investors FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy INSERT: Seulement les admins peuvent créer des investisseurs
CREATE POLICY "Only admins can create investors"
ON investors FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy UPDATE: Les utilisateurs peuvent modifier leurs propres données
-- Note: Les champs sensibles (access_level, user_id) sont protégés par trigger
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
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy DELETE: Seulement les admins peuvent supprimer
CREATE POLICY "Only admins can delete investors"
ON investors FOR DELETE
TO authenticated
USING (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- =====================================================
-- 2. TRANSACTIONS TABLE
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to read transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to update transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON transactions;

-- Policy READ: Utilisateurs voient leurs transactions OU admins voient tout
CREATE POLICY "Users read own transactions or admin reads all"
ON transactions FOR SELECT
TO authenticated
USING (
  investor_id = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy INSERT: Utilisateurs peuvent créer leurs transactions OU admins peuvent tout créer
CREATE POLICY "Users insert own transactions or admin inserts any"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (
  investor_id = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy UPDATE: Utilisateurs peuvent modifier leurs transactions OU admins peuvent tout modifier
CREATE POLICY "Users update own transactions or admin updates any"
ON transactions FOR UPDATE
TO authenticated
USING (
  investor_id = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy DELETE: Seulement les admins peuvent supprimer
CREATE POLICY "Only admins can delete transactions"
ON transactions FOR DELETE
TO authenticated
USING (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- =====================================================
-- 3. PROPERTIES TABLE
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users to read properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users to insert properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users to update properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users to delete properties" ON properties;

-- Policy READ: Tous les utilisateurs authentifiés peuvent voir les propriétés
CREATE POLICY "Authenticated users read all properties"
ON properties FOR SELECT
TO authenticated
USING (true);

-- Policy INSERT/UPDATE/DELETE: Seulement les admins
CREATE POLICY "Only admins manage properties"
ON properties FOR ALL
TO authenticated
USING (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- =====================================================
-- 4. DOCUMENTS TABLE
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON documents;

-- Policy READ: Utilisateurs voient leurs documents OU admins voient tout
CREATE POLICY "Users read own documents or admin reads all"
ON documents FOR SELECT
TO authenticated
USING (
  uploaded_by = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy INSERT: Utilisateurs peuvent uploader leurs documents
CREATE POLICY "Users insert own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy DELETE: Utilisateurs peuvent supprimer leurs documents OU admins peuvent tout supprimer
CREATE POLICY "Users delete own documents or admin deletes any"
ON documents FOR DELETE
TO authenticated
USING (
  uploaded_by = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- =====================================================
-- 5. DIVIDENDS TABLE
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON dividends;

-- Policy READ: Tous les utilisateurs peuvent voir les dividendes
CREATE POLICY "Authenticated users read all dividends"
ON dividends FOR SELECT
TO authenticated
USING (true);

-- Policy WRITE: Seulement les admins
CREATE POLICY "Only admins manage dividends"
ON dividends FOR ALL
TO authenticated
USING (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- =====================================================
-- 6. DIVIDEND_ALLOCATIONS TABLE
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON dividend_allocations;

-- Policy READ: Utilisateurs voient leurs allocations OU admins voient tout
CREATE POLICY "Users read own allocations or admin reads all"
ON dividend_allocations FOR SELECT
TO authenticated
USING (
  investor_id = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- Policy WRITE: Seulement les admins
CREATE POLICY "Only admins manage allocations"
ON dividend_allocations FOR ALL
TO authenticated
USING (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

-- =====================================================
-- 7. CAPEX_ACCOUNTS, CURRENT_ACCOUNTS, RND_ACCOUNTS
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON capex_accounts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON current_accounts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON rnd_accounts;

-- Tous les utilisateurs peuvent voir, seuls les admins peuvent modifier

CREATE POLICY "Authenticated users read capex"
ON capex_accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins manage capex"
ON capex_accounts FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "Authenticated users read current"
ON current_accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins manage current"
ON current_accounts FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "Authenticated users read rnd"
ON rnd_accounts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins manage rnd"
ON rnd_accounts FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');

-- =====================================================
-- 8. OPERATIONAL_EXPENSES
-- =====================================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON operational_expenses;

CREATE POLICY "Authenticated users read expenses"
ON operational_expenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins manage expenses"
ON operational_expenses FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');

-- =====================================================
-- 9. REPORTS
-- =====================================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON reports;

-- Reports sont des rapports globaux (trimestriel, annuel, mensuel)
-- Tous les utilisateurs peuvent les lire
CREATE POLICY "Authenticated users read all reports"
ON reports FOR SELECT
TO authenticated
USING (true);

-- Seulement les admins peuvent créer/modifier/supprimer
CREATE POLICY "Only admins manage reports"
ON reports FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');

-- =====================================================
-- 10. CORPORATE_BOOK & CORPORATE_BOOK_DOCUMENTS
-- =====================================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Allow authenticated users to read corporate_book" ON corporate_book;
DROP POLICY IF EXISTS "Allow authenticated users to insert corporate_book" ON corporate_book;
DROP POLICY IF EXISTS "Allow authenticated users to update corporate_book" ON corporate_book;
DROP POLICY IF EXISTS "Allow authenticated users to delete corporate_book" ON corporate_book;

DROP POLICY IF EXISTS "Allow authenticated users to read corporate_book_documents" ON corporate_book_documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert corporate_book_documents" ON corporate_book_documents;
DROP POLICY IF EXISTS "Allow authenticated users to update corporate_book_documents" ON corporate_book_documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete corporate_book_documents" ON corporate_book_documents;

-- Corporate Book: Tous peuvent lire, seuls admins peuvent modifier
CREATE POLICY "Authenticated users read corporate book"
ON corporate_book FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins manage corporate book"
ON corporate_book FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');

-- Corporate Book Documents: Tous peuvent lire, seuls admins peuvent modifier
CREATE POLICY "Authenticated users read corporate book documents"
ON corporate_book_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins manage corporate book documents"
ON corporate_book_documents FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin')
WITH CHECK ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');

-- =====================================================
-- 11. TRIGGER: Protéger champs sensibles de investors
-- =====================================================

CREATE OR REPLACE FUNCTION protect_investor_sensitive_fields()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur actuel est admin
  SELECT EXISTS (
    SELECT 1 FROM investors
    WHERE user_id = auth.uid()
    AND access_level = 'admin'
  ) INTO is_admin_user;

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

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_protect_investor_fields ON investors;
CREATE TRIGGER trigger_protect_investor_fields
  BEFORE UPDATE ON investors
  FOR EACH ROW
  EXECUTE FUNCTION protect_investor_sensitive_fields();

-- =====================================================
-- CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ RLS POLICIES CORRIGÉES AVEC SUCCÈS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables sécurisées:';
  RAISE NOTICE '  ✓ investors (scope: user_id)';
  RAISE NOTICE '  ✓ transactions (scope: investor_id)';
  RAISE NOTICE '  ✓ properties (read all, admin write)';
  RAISE NOTICE '  ✓ documents (scope: uploaded_by)';
  RAISE NOTICE '  ✓ dividends (read all, admin write)';
  RAISE NOTICE '  ✓ dividend_allocations (scope: investor_id)';
  RAISE NOTICE '  ✓ capex_accounts (read all, admin write)';
  RAISE NOTICE '  ✓ current_accounts (read all, admin write)';
  RAISE NOTICE '  ✓ rnd_accounts (read all, admin write)';
  RAISE NOTICE '  ✓ operational_expenses (read all, admin write)';
  RAISE NOTICE '  ✓ reports (read all, admin write)';
  RAISE NOTICE '  ✓ corporate_book (read all, admin write)';
  RAISE NOTICE '  ✓ corporate_book_documents (read all, admin write)';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Trigger de protection créé:';
  RAISE NOTICE '  - protect_investor_sensitive_fields()';
  RAISE NOTICE '  - Empêche modification non-autorisée access_level/user_id';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT:';
  RAISE NOTICE '  1. Vérifier que le premier utilisateur a access_level = admin';
  RAISE NOTICE '  2. Tester la connexion avec un compte non-admin';
  RAISE NOTICE '  3. Tester tentative modification access_level (doit échouer)';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
