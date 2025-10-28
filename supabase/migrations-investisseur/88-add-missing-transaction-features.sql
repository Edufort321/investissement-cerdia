-- ==========================================
-- MIGRATION 88: AJOUTER FONCTIONNALITÉS MANQUANTES POUR LES TRANSACTIONS
-- ==========================================
--
-- OBJECTIF: Compléter le système de gestion des transactions
--
-- 1. Ajouter le type 'remboursement_investisseur' pour les remboursements
-- 2. Créer une table pour gérer les pièces jointes multiples (transaction_attachments)
-- 3. Ajouter des champs manquants pour les remboursements
--
-- ==========================================

-- ==========================================
-- 1. METTRE À JOUR LA CONTRAINTE DES TYPES
-- ==========================================

-- Supprimer l'ancienne contrainte
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Créer la nouvelle contrainte avec le type remboursement_investisseur
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    -- ENTRÉES D'ARGENT (montant positif)
    'investissement',  -- Investisseur achète des parts
    'loyer',          -- Revenus locatifs
    'dividende',      -- Distribution de profits

    -- SORTIES D'ARGENT (montant négatif)
    'achat_propriete',        -- Achat de propriété
    'depense',                -- Dépense générale
    'capex',                  -- Amélioration propriété
    'maintenance',            -- Entretien propriété
    'admin',                  -- Frais administratifs
    'remboursement_investisseur', -- Remboursement investisseur (NOUVEAU)
    'courant',                -- Compte courant
    'rnd'                     -- Recherche & développement
  ));

COMMENT ON CONSTRAINT transactions_type_check ON transactions IS
  'Types de transactions autorisés - utilisez montant positif pour entrées, négatif pour sorties';

-- ==========================================
-- 2. AJOUTER CHAMPS POUR REMBOURSEMENTS
-- ==========================================

-- Ajouter colonne pour indiquer si c'est un remboursement en parts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='transactions' AND column_name='reimbursement_in_shares'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN reimbursement_in_shares BOOLEAN DEFAULT FALSE;

    COMMENT ON COLUMN transactions.reimbursement_in_shares IS
      'Si true, le remboursement est effectué en parts plutôt qu''en argent';
  END IF;
END $$;

-- Ajouter colonne pour le nombre de parts remboursées
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='transactions' AND column_name='shares_returned'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN shares_returned INTEGER DEFAULT 0;

    COMMENT ON COLUMN transactions.shares_returned IS
      'Nombre de parts rendues lors d''un remboursement en parts';
  END IF;
END $$;

-- ==========================================
-- 3. CRÉER TABLE TRANSACTION_ATTACHMENTS
-- ==========================================

-- Cette table permet d'avoir plusieurs pièces jointes par transaction
CREATE TABLE IF NOT EXISTS transaction_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction_id
  ON transaction_attachments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_uploaded_by
  ON transaction_attachments(uploaded_by);

-- Commentaires
COMMENT ON TABLE transaction_attachments IS
  'Pièces jointes associées aux transactions (factures, reçus, contrats, etc.)';

COMMENT ON COLUMN transaction_attachments.transaction_id IS
  'Référence vers la transaction parente';

COMMENT ON COLUMN transaction_attachments.storage_path IS
  'Chemin du fichier dans Supabase Storage (bucket: transaction-documents)';

-- ==========================================
-- 4. CRÉER LES POLICIES RLS
-- ==========================================

-- Activer RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Les utilisateurs authentifiés peuvent voir toutes les pièces jointes
CREATE POLICY "Utilisateurs authentifiés peuvent voir les pièces jointes"
  ON transaction_attachments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT: Les utilisateurs authentifiés peuvent ajouter des pièces jointes
CREATE POLICY "Utilisateurs authentifiés peuvent ajouter des pièces jointes"
  ON transaction_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy UPDATE: Les utilisateurs authentifiés peuvent modifier les pièces jointes
CREATE POLICY "Utilisateurs authentifiés peuvent modifier les pièces jointes"
  ON transaction_attachments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy DELETE: Les utilisateurs authentifiés peuvent supprimer les pièces jointes
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les pièces jointes"
  ON transaction_attachments
  FOR DELETE
  TO authenticated
  USING (true);

-- ==========================================
-- 5. CRÉER BUCKET STORAGE SI NÉCESSAIRE
-- ==========================================

-- Créer le bucket transaction-documents s'il n'existe pas
DO $$
BEGIN
  -- Vérifier si le bucket existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'transaction-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('transaction-documents', 'transaction-documents', false);

    RAISE NOTICE '✅ Bucket "transaction-documents" créé';
  ELSE
    RAISE NOTICE '✓ Bucket "transaction-documents" existe déjà';
  END IF;
END $$;

-- ==========================================
-- 6. CRÉER POLICIES STORAGE
-- ==========================================

-- Note: On utilise DROP IF EXISTS puis CREATE au lieu de vérifier storage.policies
-- car cette table n'existe pas dans toutes les versions de Supabase

-- Policy SELECT: Utilisateurs authentifiés peuvent voir les documents
DROP POLICY IF EXISTS "Authenticated users can view transaction documents" ON storage.objects;
CREATE POLICY "Authenticated users can view transaction documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'transaction-documents');

-- Policy INSERT: Utilisateurs authentifiés peuvent uploader des documents
DROP POLICY IF EXISTS "Authenticated users can upload transaction documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload transaction documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'transaction-documents');

-- Policy DELETE: Utilisateurs authentifiés peuvent supprimer des documents
DROP POLICY IF EXISTS "Authenticated users can delete transaction documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete transaction documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'transaction-documents');

-- ==========================================
-- 7. FONCTION HELPER: GET_TRANSACTION_WITH_ATTACHMENTS
-- ==========================================

CREATE OR REPLACE FUNCTION get_transaction_with_attachments(p_transaction_id UUID)
RETURNS JSON AS $$
DECLARE
  v_transaction JSON;
  v_attachments JSON;
BEGIN
  -- Récupérer la transaction
  SELECT row_to_json(t.*) INTO v_transaction
  FROM transactions t
  WHERE t.id = p_transaction_id;

  -- Récupérer les pièces jointes
  SELECT COALESCE(json_agg(a.*), '[]'::json) INTO v_attachments
  FROM transaction_attachments a
  WHERE a.transaction_id = p_transaction_id;

  -- Combiner les données
  RETURN json_build_object(
    'transaction', v_transaction,
    'attachments', v_attachments
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_transaction_with_attachments IS
  'Récupère une transaction avec toutes ses pièces jointes';

-- ==========================================
-- 8. TRIGGER: AUTO UPDATE TIMESTAMP
-- ==========================================

CREATE OR REPLACE FUNCTION update_transaction_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_transaction_attachments_updated_at
  ON transaction_attachments;

CREATE TRIGGER trigger_update_transaction_attachments_updated_at
  BEFORE UPDATE ON transaction_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_attachments_updated_at();

-- ==========================================
-- 9. VUE: RÉSUMÉ DES REMBOURSEMENTS
-- ==========================================

CREATE OR REPLACE VIEW reimbursements_summary AS
SELECT
  t.id,
  t.date,
  t.amount,
  t.description,
  t.reimbursement_in_shares,
  t.shares_returned,
  i.first_name || ' ' || i.last_name as investor_name,
  i.email as investor_email,
  (
    SELECT COUNT(*)
    FROM transaction_attachments ta
    WHERE ta.transaction_id = t.id
  ) as attachment_count
FROM transactions t
LEFT JOIN investors i ON t.investor_id = i.id
WHERE t.type = 'remboursement_investisseur'
ORDER BY t.date DESC;

COMMENT ON VIEW reimbursements_summary IS
  'Vue récapitulative des remboursements d''investisseurs';

-- ==========================================
-- 10. GUIDE D'UTILISATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 MIGRATION 88: FONCTIONNALITÉS TRANSACTIONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ AJOUTS:';
  RAISE NOTICE '  • Type "remboursement_investisseur" disponible';
  RAISE NOTICE '  • Table "transaction_attachments" pour pièces jointes multiples';
  RAISE NOTICE '  • Colonnes "reimbursement_in_shares" et "shares_returned"';
  RAISE NOTICE '  • Bucket Storage "transaction-documents"';
  RAISE NOTICE '  • Policies RLS pour sécurité';
  RAISE NOTICE '';
  RAISE NOTICE '💡 UTILISATION:';
  RAISE NOTICE '';
  RAISE NOTICE '1. REMBOURSEMENT EN ARGENT:';
  RAISE NOTICE '   INSERT INTO transactions (type, amount, investor_id, description)';
  RAISE NOTICE '   VALUES (''remboursement_investisseur'', -5000, ''<id>'', ''Remboursement partiel'');';
  RAISE NOTICE '';
  RAISE NOTICE '2. REMBOURSEMENT EN PARTS:';
  RAISE NOTICE '   INSERT INTO transactions (';
  RAISE NOTICE '     type, amount, investor_id, description,';
  RAISE NOTICE '     reimbursement_in_shares, shares_returned';
  RAISE NOTICE '   ) VALUES (';
  RAISE NOTICE '     ''remboursement_investisseur'', 0, ''<id>'', ''Remboursement 100 parts'',';
  RAISE NOTICE '     true, 100';
  RAISE NOTICE '   );';
  RAISE NOTICE '';
  RAISE NOTICE '3. AJOUTER PIÈCE JOINTE:';
  RAISE NOTICE '   INSERT INTO transaction_attachments (';
  RAISE NOTICE '     transaction_id, file_name, file_size, mime_type, storage_path';
  RAISE NOTICE '   ) VALUES (';
  RAISE NOTICE '     ''<transaction_id>'', ''recu.pdf'', 12345, ''application/pdf'',';
  RAISE NOTICE '     ''investor-id/2025/recu.pdf''';
  RAISE NOTICE '   );';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 88 TERMINÉE' as status,
  'Type remboursement_investisseur + table transaction_attachments créés' as message;
