-- ==========================================
-- SYSTÈME DE PIÈCES JOINTES POUR LES PROJETS
-- Photos et documents liés aux propriétés
-- ==========================================

-- Créer la table property_attachments
CREATE TABLE IF NOT EXISTS property_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  storage_path TEXT NOT NULL UNIQUE,
  file_size BIGINT,
  description TEXT,
  attachment_category VARCHAR(50) DEFAULT 'general', -- 'photo', 'document', 'plan', 'contract', 'general'
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_category CHECK (attachment_category IN ('photo', 'document', 'plan', 'contract', 'invoice', 'general'))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_property_attachments_property_id ON property_attachments(property_id);
CREATE INDEX IF NOT EXISTS idx_property_attachments_category ON property_attachments(attachment_category);
CREATE INDEX IF NOT EXISTS idx_property_attachments_uploaded_at ON property_attachments(uploaded_at DESC);

-- Commentaires
COMMENT ON TABLE property_attachments IS 'Pièces jointes et photos des propriétés immobilières';
COMMENT ON COLUMN property_attachments.property_id IS 'Référence à la propriété';
COMMENT ON COLUMN property_attachments.file_name IS 'Nom original du fichier';
COMMENT ON COLUMN property_attachments.file_type IS 'Type MIME du fichier';
COMMENT ON COLUMN property_attachments.storage_path IS 'Chemin dans Supabase Storage';
COMMENT ON COLUMN property_attachments.file_size IS 'Taille du fichier en bytes';
COMMENT ON COLUMN property_attachments.attachment_category IS 'Catégorie: photo, document, plan, contract, invoice, general';

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_property_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_attachments_updated_at
  BEFORE UPDATE ON property_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_property_attachments_updated_at();

-- RLS (Row Level Security)
ALTER TABLE property_attachments ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut voir les pièces jointes
CREATE POLICY "Anyone can view property attachments"
  ON property_attachments
  FOR SELECT
  USING (true);

-- Politique: Les utilisateurs authentifiés peuvent insérer
CREATE POLICY "Authenticated users can insert property attachments"
  ON property_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique: Les utilisateurs authentifiés peuvent mettre à jour
CREATE POLICY "Authenticated users can update property attachments"
  ON property_attachments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique: Les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Authenticated users can delete property attachments"
  ON property_attachments
  FOR DELETE
  TO authenticated
  USING (true);

-- Créer le bucket de stockage dans Supabase Storage
-- Note: Cette commande doit être exécutée via l'interface Supabase ou l'API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('property-attachments', 'property-attachments', true);

-- Confirmation
SELECT
  '✅ TABLE PROPERTY_ATTACHMENTS CRÉÉE' as status,
  'Table: property_attachments avec catégories' as details,
  'Bucket Storage: property-attachments (à créer manuellement)' as note;
