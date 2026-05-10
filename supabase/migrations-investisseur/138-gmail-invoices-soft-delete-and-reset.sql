-- ============================================================
-- Migration 138 : gmail_invoices
--   - soft-delete (deleted_at)
--   - dedup par hash de piece jointe (attachment_hash)
--   - thread_id (info)
--   - vues mises a jour pour masquer les soft-deleted
--   - backup de l'etat actuel + purge pour repartir a zero
--
-- Ce fichier est idempotent : peut etre re-execute sans casse.
-- ============================================================

-- ── 1. Ajout des colonnes ────────────────────────────────────
ALTER TABLE gmail_invoices ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;
ALTER TABLE gmail_invoices ADD COLUMN IF NOT EXISTS attachment_hash TEXT;
ALTER TABLE gmail_invoices ADD COLUMN IF NOT EXISTS thread_id       TEXT;

-- ── 2. Index ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gmail_invoices_active
    ON gmail_invoices (deleted_at)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gmail_invoices_active_hash
    ON gmail_invoices (attachment_hash)
    WHERE attachment_hash IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gmail_invoices_thread_id
    ON gmail_invoices (thread_id);

-- ── 3. Vues : masquer les soft-deleted ──────────────────────
DROP VIEW IF EXISTS v_factures;
CREATE VIEW v_factures AS
SELECT id, message_id, vendor_name, document_date, document_number,
       amount, currency, payment_method, is_paid,
       classification_confidence, extraction_confidence,
       cerdia_company, gmail_link, file_path, classified_at
FROM gmail_invoices
WHERE category = 'FACTURE'
  AND deleted_at IS NULL
ORDER BY document_date DESC NULLS LAST;

DROP VIEW IF EXISTS v_recus;
CREATE VIEW v_recus AS
SELECT id, message_id, vendor_name, document_date, document_number,
       amount, currency, payment_method,
       classification_confidence, extraction_confidence,
       cerdia_company, gmail_link, file_path, classified_at
FROM gmail_invoices
WHERE category = 'RECU_PAIEMENT'
  AND deleted_at IS NULL
ORDER BY document_date DESC NULLS LAST;

DROP VIEW IF EXISTS v_monthly_totals;
CREATE VIEW v_monthly_totals AS
SELECT cerdia_company,
       TO_CHAR(document_date, 'YYYY-MM') AS month,
       category,
       COUNT(*) AS count,
       SUM(amount) FILTER (WHERE currency = 'CAD') AS total_cad,
       SUM(amount) FILTER (WHERE currency = 'USD') AS total_usd
FROM gmail_invoices
WHERE category IN ('FACTURE', 'RECU_PAIEMENT')
  AND document_date IS NOT NULL
  AND deleted_at IS NULL
GROUP BY cerdia_company, TO_CHAR(document_date, 'YYYY-MM'), category
ORDER BY month DESC, cerdia_company;

DROP VIEW IF EXISTS v_unassigned;
CREATE VIEW v_unassigned AS
SELECT id, message_id, category, vendor_name,
       document_date, amount, currency, gmail_link, classification_confidence
FROM gmail_invoices
WHERE cerdia_company IS NULL
  AND category IN ('FACTURE', 'RECU_PAIEMENT')
  AND deleted_at IS NULL
ORDER BY document_date DESC NULLS LAST;

-- ── 4. Comments ──────────────────────────────────────────────
COMMENT ON COLUMN gmail_invoices.deleted_at      IS 'Soft-delete : si NOT NULL, masquee de UI et le sync Python skip cette row';
COMMENT ON COLUMN gmail_invoices.attachment_hash IS 'SHA-256 du PDF attache - empeche les doublons (memes PDF dans threads/reponses differents)';
COMMENT ON COLUMN gmail_invoices.thread_id       IS 'Gmail threadId (info, non bloquant pour la dedup)';

-- ── 5. Backup de l'etat actuel ──────────────────────────────
DROP TABLE IF EXISTS gmail_invoices_backup_20260510;
CREATE TABLE gmail_invoices_backup_20260510 AS
SELECT * FROM gmail_invoices;

-- ── 6. Purge de la table active ─────────────────────────────
TRUNCATE TABLE gmail_invoices RESTART IDENTITY;

-- ── 7. Verification ──────────────────────────────────────────
SELECT 'active rows apres purge' AS info, COUNT(*) AS n FROM gmail_invoices
UNION ALL
SELECT 'rows sauvegardees',                COUNT(*)      FROM gmail_invoices_backup_20260510;
