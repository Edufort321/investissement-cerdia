-- =====================================================
-- SCRIPT 60 : LIVRE D'ENTREPRISE (Corporate Book)
-- Pour notaires, avocats, et conformité légale
-- Date: 2025-10-24
-- =====================================================

-- =====================================================
-- 1. TABLE PRINCIPALE : corporate_book
-- =====================================================

CREATE TABLE IF NOT EXISTS corporate_book (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Type d'entrée
  entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
    'property_acquisition',      -- Achat immobilier
    'property_sale',             -- Vente immobilier
    'share_issuance',            -- Émission de parts
    'share_transfer',            -- Transfert de parts
    'share_redemption',          -- Rachat de parts
    'general_meeting',           -- Assemblée générale
    'board_meeting',             -- Conseil d'administration
    'resolution',                -- Résolution
    'legal_document',            -- Document légal
    'other'                      -- Autre
  )),

  -- Informations de base
  entry_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Liens avec autres tables
  property_id UUID REFERENCES properties(id),
  transaction_id UUID REFERENCES transactions(id),
  investor_id UUID REFERENCES investors(id),

  -- Détails financiers (optionnel)
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'CAD',

  -- Détails spécifiques selon le type
  metadata JSONB DEFAULT '{}',
  -- Exemples de metadata:
  -- Pour property_acquisition: {purchase_price, notary, deed_number}
  -- Pour share_issuance: {shares_issued, price_per_share, investor_name}
  -- Pour meeting: {attendees, resolutions, location}

  -- Documents attachés
  has_documents BOOLEAN DEFAULT FALSE,

  -- Statut
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'filed')),

  -- Notes légales
  legal_reference VARCHAR(255),
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX idx_corporate_book_entry_type ON corporate_book(entry_type);
CREATE INDEX idx_corporate_book_entry_date ON corporate_book(entry_date DESC);
CREATE INDEX idx_corporate_book_property ON corporate_book(property_id);
CREATE INDEX idx_corporate_book_transaction ON corporate_book(transaction_id);
CREATE INDEX idx_corporate_book_investor ON corporate_book(investor_id);
CREATE INDEX idx_corporate_book_status ON corporate_book(status);

-- =====================================================
-- 2. TABLE : corporate_book_documents
-- =====================================================

CREATE TABLE IF NOT EXISTS corporate_book_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_book_id UUID NOT NULL REFERENCES corporate_book(id) ON DELETE CASCADE,

  -- Informations du document
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
    'deed',                      -- Acte notarié
    'contract',                  -- Contrat
    'resolution',                -- Résolution
    'minutes',                   -- Procès-verbal
    'agreement',                 -- Convention
    'certificate',               -- Certificat
    'legal_opinion',             -- Avis juridique
    'other'                      -- Autre
  )),

  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  storage_path TEXT NOT NULL,

  description TEXT,
  document_date DATE,

  -- Métadonnées
  is_original BOOLEAN DEFAULT TRUE,
  is_signed BOOLEAN DEFAULT FALSE,

  -- Audit
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_corporate_book_docs_book_id ON corporate_book_documents(corporate_book_id);
CREATE INDEX idx_corporate_book_docs_type ON corporate_book_documents(document_type);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE corporate_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_book_documents ENABLE ROW LEVEL SECURITY;

-- Policy pour corporate_book
CREATE POLICY "Allow authenticated users to read corporate_book"
  ON corporate_book FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert corporate_book"
  ON corporate_book FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update corporate_book"
  ON corporate_book FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete corporate_book"
  ON corporate_book FOR DELETE
  TO authenticated
  USING (true);

-- Policy pour corporate_book_documents
CREATE POLICY "Allow authenticated users to read corporate_book_documents"
  ON corporate_book_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert corporate_book_documents"
  ON corporate_book_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update corporate_book_documents"
  ON corporate_book_documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete corporate_book_documents"
  ON corporate_book_documents FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 4. FONCTION : Trigger pour update timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_corporate_book_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_corporate_book_timestamp
  BEFORE UPDATE ON corporate_book
  FOR EACH ROW
  EXECUTE FUNCTION update_corporate_book_timestamp();

-- =====================================================
-- 5. FONCTION : Mettre à jour has_documents
-- =====================================================

CREATE OR REPLACE FUNCTION update_corporate_book_has_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE corporate_book
    SET has_documents = TRUE
    WHERE id = NEW.corporate_book_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE corporate_book
    SET has_documents = EXISTS(
      SELECT 1 FROM corporate_book_documents
      WHERE corporate_book_id = OLD.corporate_book_id
    )
    WHERE id = OLD.corporate_book_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_has_documents
  AFTER INSERT OR DELETE ON corporate_book_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_corporate_book_has_documents();

-- =====================================================
-- 6. VUE : Vue complète pour affichage
-- =====================================================

CREATE OR REPLACE VIEW corporate_book_view AS
SELECT
  cb.*,
  p.name as property_name,
  p.location as property_location,
  t.description as transaction_description,
  t.amount as transaction_amount,
  i.first_name || ' ' || i.last_name as investor_name,
  (SELECT COUNT(*) FROM corporate_book_documents WHERE corporate_book_id = cb.id) as document_count
FROM corporate_book cb
LEFT JOIN properties p ON cb.property_id = p.id
LEFT JOIN transactions t ON cb.transaction_id = t.id
LEFT JOIN investors i ON cb.investor_id = i.id
ORDER BY cb.entry_date DESC, cb.created_at DESC;

-- =====================================================
-- CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ LIVRE D''ENTREPRISE CRÉÉ AVEC SUCCÈS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Tables créées :';
  RAISE NOTICE '  - corporate_book (entrées principales)';
  RAISE NOTICE '  - corporate_book_documents (documents)';
  RAISE NOTICE '  - corporate_book_view (vue complète)';
  RAISE NOTICE '';
  RAISE NOTICE 'Types d''entrées disponibles :';
  RAISE NOTICE '  - Achats/ventes immobiliers';
  RAISE NOTICE '  - Émission/transfert/rachat de parts';
  RAISE NOTICE '  - Assemblées et réunions';
  RAISE NOTICE '  - Résolutions et documents légaux';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaine étape :';
  RAISE NOTICE '  Créer le composant CorporateBookTab.tsx';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
