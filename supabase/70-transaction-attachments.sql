-- =====================================================
-- 📎 PIÈCES JOINTES TRANSACTIONS
-- =====================================================
-- Script pour ajouter les pièces jointes aux transactions
-- Date: 2025-10-25
-- Objectif: Traçabilité comptable complète avec preuves

-- 1. Ajouter colonnes pour les pièces jointes
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

-- 2. Créer index pour recherche rapide
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_attachment_path
ON transactions(attachment_storage_path)
WHERE attachment_storage_path IS NOT NULL;

-- 3. Vue étendue avec pièces jointes
-- =====================================================

CREATE OR REPLACE VIEW transactions_with_attachments AS
SELECT
  t.*,
  CASE
    WHEN t.attachment_storage_path IS NOT NULL THEN true
    ELSE false
  END as has_attachment,
  CASE
    WHEN t.attachment_mime_type LIKE 'image/%' THEN 'image'
    WHEN t.attachment_mime_type LIKE 'application/pdf' THEN 'pdf'
    WHEN t.attachment_mime_type LIKE 'application/%' THEN 'document'
    ELSE 'other'
  END as attachment_type
FROM transactions t;

COMMENT ON VIEW transactions_with_attachments IS 'Vue des transactions avec informations pièces jointes';

-- 4. Fonction helper pour obtenir URL signée
-- =====================================================

CREATE OR REPLACE FUNCTION get_transaction_attachment_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- L'URL sera générée côté client avec Supabase Storage
  -- Cette fonction sert de placeholder pour future implémentation serveur
  RETURN storage_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Statistiques sur les pièces jointes
-- =====================================================

CREATE OR REPLACE VIEW transaction_attachments_stats AS
SELECT
  COUNT(*) FILTER (WHERE attachment_storage_path IS NOT NULL) as total_with_attachments,
  COUNT(*) FILTER (WHERE attachment_storage_path IS NULL) as total_without_attachments,
  COUNT(*) as total_transactions,
  ROUND(
    (COUNT(*) FILTER (WHERE attachment_storage_path IS NOT NULL)::NUMERIC /
     NULLIF(COUNT(*), 0)) * 100,
    2
  ) as percentage_with_attachments,
  SUM(attachment_size) FILTER (WHERE attachment_size IS NOT NULL) as total_storage_bytes,
  ROUND(
    AVG(attachment_size) FILTER (WHERE attachment_size IS NOT NULL) / 1024.0,
    2
  ) as avg_file_size_kb
FROM transactions;

COMMENT ON VIEW transaction_attachments_stats IS 'Statistiques globales sur les pièces jointes';

-- 6. Vue pour transactions sans pièce jointe (pour suivi comptable)
-- =====================================================

CREATE OR REPLACE VIEW transactions_missing_attachments AS
SELECT
  t.id,
  t.date,
  t.type,
  t.amount,
  t.description,
  t.payment_method,
  t.status,
  i.first_name || ' ' || i.last_name as created_by,
  CURRENT_DATE - t.date::DATE as days_since_transaction
FROM transactions t
LEFT JOIN investors i ON i.id = (
  SELECT investor_id FROM investors WHERE user_id = auth.uid() LIMIT 1
)
WHERE
  t.attachment_storage_path IS NULL
  AND t.type IN ('investissement', 'depense', 'capex')  -- Types nécessitant justificatif
  AND t.amount > 100  -- Montant significatif
ORDER BY t.date DESC;

COMMENT ON VIEW transactions_missing_attachments IS 'Transactions sans pièce jointe nécessitant suivi';

-- =====================================================
-- 📋 RÉSUMÉ
-- =====================================================

/*
Nouvelles colonnes:
- attachment_name: Nom fichier
- attachment_url: URL publique
- attachment_storage_path: Chemin storage
- attachment_mime_type: Type MIME
- attachment_size: Taille octets
- attachment_uploaded_at: Date upload

Vues créées:
- transactions_with_attachments: Transactions avec info pièces
- transaction_attachments_stats: Statistiques globales
- transactions_missing_attachments: Transactions à compléter

Next steps:
1. Créer bucket 'transaction-attachments' dans Storage
2. Créer policies de sécurité pour le bucket
3. Implémenter upload UI dans formulaire transaction
4. Ajouter affichage pièces dans historique
5. Intégrer dans génération PDF
*/
