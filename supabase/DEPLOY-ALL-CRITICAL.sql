-- =====================================================
-- 🚀 DÉPLOIEMENT COMPLET - TOUT EN UN
-- =====================================================
-- Ce script consolide TOUS les éléments critiques à déployer
-- Exécuter ce script unique au lieu de 6 scripts séparés
-- Date: 2025-10-25
-- =====================================================

-- =====================================================
-- ÉTAPE 1: FIX RÉCURSION RLS (CRITIQUE)
-- =====================================================

-- Créer fonctions helper SECURITY DEFINER
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

-- Supprimer anciennes policies investors
DROP POLICY IF EXISTS "Users read own data or admin reads all" ON investors;
DROP POLICY IF EXISTS "Only admins can create investors" ON investors;
DROP POLICY IF EXISTS "Users update own data" ON investors;
DROP POLICY IF EXISTS "Admins update any investor" ON investors;
DROP POLICY IF EXISTS "Only admins can delete investors" ON investors;

-- Recréer policies investors sans récursion
CREATE POLICY "Users read own data or admin reads all"
ON investors FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Only admins can create investors"
ON investors FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Users update own data"
ON investors FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update any investor"
ON investors FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete investors"
ON investors FOR DELETE TO authenticated
USING (is_admin());

-- Mettre à jour policies transactions
DROP POLICY IF EXISTS "Users read own transactions or admin reads all" ON transactions;
DROP POLICY IF EXISTS "Users insert own transactions or admin inserts any" ON transactions;
DROP POLICY IF EXISTS "Users update own transactions or admin updates any" ON transactions;
DROP POLICY IF EXISTS "Only admins can delete transactions" ON transactions;

CREATE POLICY "Users read own transactions or admin reads all"
ON transactions FOR SELECT TO authenticated
USING (investor_id = get_current_investor_id() OR is_admin());

CREATE POLICY "Users insert own transactions or admin inserts any"
ON transactions FOR INSERT TO authenticated
WITH CHECK (investor_id = get_current_investor_id() OR is_admin());

CREATE POLICY "Users update own transactions or admin updates any"
ON transactions FOR UPDATE TO authenticated
USING (investor_id = get_current_investor_id() OR is_admin());

CREATE POLICY "Only admins can delete transactions"
ON transactions FOR DELETE TO authenticated
USING (is_admin());

SELECT '✅ ÉTAPE 1: RLS Récursion corrigée' AS status;

-- =====================================================
-- ÉTAPE 2: CRÉATION DES BUCKETS STORAGE
-- =====================================================

-- BUCKET 1: documents (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- BUCKET 2: scenario-documents (PRIVÉ)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scenario-documents',
  'scenario-documents',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'];

-- BUCKET 3: property-attachments (PRIVÉ)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-attachments',
  'property-attachments',
  false,
  104857600,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip','application/x-zip-compressed']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip','application/x-zip-compressed'];

-- BUCKET 4: transaction-attachments (PRIVÉ)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transaction-attachments',
  'transaction-attachments',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

SELECT '✅ ÉTAPE 2: 4 Buckets Storage créés' AS status;

-- =====================================================
-- ÉTAPE 3: POLICIES STORAGE SCENARIO-DOCUMENTS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can upload scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scenario documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update scenario documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload scenario documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scenario-documents');

CREATE POLICY "Authenticated users can view scenario documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'scenario-documents');

CREATE POLICY "Authenticated users can delete scenario documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'scenario-documents');

CREATE POLICY "Authenticated users can update scenario documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'scenario-documents');

SELECT '✅ ÉTAPE 3: Policies scenario-documents créées' AS status;

-- =====================================================
-- ÉTAPE 4: PIÈCES JOINTES TRANSACTIONS - TABLES
-- =====================================================

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_storage_path TEXT,
ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
ADD COLUMN IF NOT EXISTS attachment_uploaded_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN transactions.attachment_name IS 'Nom du fichier joint (facture, reçu, etc.)';
COMMENT ON COLUMN transactions.attachment_url IS 'URL publique pour téléchargement';
COMMENT ON COLUMN transactions.attachment_storage_path IS 'Chemin dans Supabase Storage';
COMMENT ON COLUMN transactions.attachment_mime_type IS 'Type MIME du fichier (image/pdf/etc)';
COMMENT ON COLUMN transactions.attachment_size IS 'Taille du fichier en octets';
COMMENT ON COLUMN transactions.attachment_uploaded_at IS 'Date d''upload de la pièce jointe';

CREATE INDEX IF NOT EXISTS idx_transactions_attachment_path
ON transactions(attachment_storage_path)
WHERE attachment_storage_path IS NOT NULL;

SELECT '✅ ÉTAPE 4: Colonnes pièces jointes transactions ajoutées' AS status;

-- =====================================================
-- ÉTAPE 5: POLICIES STORAGE TRANSACTION-ATTACHMENTS
-- =====================================================

-- Fonction helper pour vérifier admin (si pas déjà créée)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM investors
    WHERE user_id = auth.uid()
    AND access_level = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper pour obtenir investor_id (si pas déjà créée)
CREATE OR REPLACE FUNCTION get_current_investor_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM investors
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admin can view all transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete transaction attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own transaction attachments" ON storage.objects;

-- SELECT
CREATE POLICY "Admin can view all transaction attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'transaction-attachments' AND is_admin());

CREATE POLICY "Users can view own transaction attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.attachment_storage_path = name
    AND (
      t.investor_id = get_current_investor_id()
      OR
      t.property_id IN (
        SELECT DISTINCT property_id FROM transactions
        WHERE investor_id = get_current_investor_id()
      )
    )
  )
);

-- INSERT
CREATE POLICY "Admin can upload transaction attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'transaction-attachments' AND is_admin());

CREATE POLICY "Users can upload own transaction attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'transaction-attachments'
  AND (
    name LIKE '%/' || get_current_investor_id()::TEXT || '/%'
    OR is_admin()
  )
);

-- UPDATE
CREATE POLICY "Admin can update transaction attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'transaction-attachments' AND is_admin())
WITH CHECK (bucket_id = 'transaction-attachments' AND is_admin());

CREATE POLICY "Users can update own transaction attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.attachment_storage_path = name
    AND t.investor_id = get_current_investor_id()
  )
)
WITH CHECK (
  bucket_id = 'transaction-attachments'
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.attachment_storage_path = name
    AND t.investor_id = get_current_investor_id()
  )
);

-- DELETE
CREATE POLICY "Admin can delete transaction attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'transaction-attachments' AND is_admin());

CREATE POLICY "Users can delete own transaction attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'transaction-attachments'
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.attachment_storage_path = name
    AND t.investor_id = get_current_investor_id()
  )
);

SELECT '✅ ÉTAPE 5: Policies transaction-attachments créées' AS status;

-- =====================================================
-- ÉTAPE 6: DEVISE ET RÉPARTITION FRAIS SCÉNARIOS
-- =====================================================

ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3) DEFAULT 'USD' CHECK (purchase_currency IN ('USD', 'CAD')),
ADD COLUMN IF NOT EXISTS exchange_rate_at_creation DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS initial_fees_distribution VARCHAR(20) DEFAULT 'first_payment' CHECK (initial_fees_distribution IN ('equal', 'first_payment'));

COMMENT ON COLUMN scenarios.purchase_currency IS 'Devise du prix d''achat (USD ou CAD)';
COMMENT ON COLUMN scenarios.exchange_rate_at_creation IS 'Taux de change USD→CAD au moment de la création du scénario';
COMMENT ON COLUMN scenarios.initial_fees_distribution IS 'Répartition des frais initiaux: equal (égal sur tous termes) ou first_payment (sur premier paiement)';

UPDATE scenarios
SET
  purchase_currency = 'USD',
  initial_fees_distribution = 'first_payment'
WHERE
  purchase_currency IS NULL
  OR initial_fees_distribution IS NULL;

CREATE INDEX IF NOT EXISTS idx_scenarios_purchase_currency
ON scenarios(purchase_currency)
WHERE purchase_currency IS NOT NULL;

SELECT '✅ ÉTAPE 6: Colonnes devise scénarios ajoutées' AS status;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🚀 DÉPLOIEMENT COMPLET TERMINÉ AVEC SUCCÈS';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Récursion RLS corrigée (is_admin, get_current_investor_id)';
  RAISE NOTICE '✅ 4 Buckets Storage créés:';
  RAISE NOTICE '   - documents (public, 50MB)';
  RAISE NOTICE '   - scenario-documents (privé, 50MB)';
  RAISE NOTICE '   - property-attachments (privé, 100MB)';
  RAISE NOTICE '   - transaction-attachments (privé, 50MB)';
  RAISE NOTICE '✅ Policies Storage configurées (scénarios + transactions)';
  RAISE NOTICE '✅ Pièces jointes transactions (6 colonnes)';
  RAISE NOTICE '✅ Devise et répartition frais scénarios (3 colonnes)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Votre application est maintenant complètement configurée!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RAPPELS:';
  RAISE NOTICE '   1. Rafraîchir la page (F5)';
  RAISE NOTICE '   2. Vérifier que vous avez un user admin dans investors';
  RAISE NOTICE '   3. Tester upload de documents dans scénarios';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;

-- Afficher les buckets créés
SELECT
  id AS "Bucket",
  CASE WHEN public THEN '🌍 Public' ELSE '🔒 Privé' END AS "Visibilité",
  file_size_limit / 1048576 || ' MB' AS "Limite",
  created_at AS "Créé le"
FROM storage.buckets
WHERE id IN ('documents', 'scenario-documents', 'property-attachments', 'transaction-attachments')
ORDER BY id;
