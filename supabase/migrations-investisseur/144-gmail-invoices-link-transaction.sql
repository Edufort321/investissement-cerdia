-- ============================================================
-- Migration 144 : gmail_invoices.linked_transaction_id
--
-- Permet de lier une facture Gmail a une transaction commerce.
-- Une fois liee, la facture disparait de la liste "non classees"
-- (= archivee dans le workflow Eric).
-- ============================================================

ALTER TABLE gmail_invoices
    ADD COLUMN IF NOT EXISTS linked_transaction_id UUID NULL;

-- FK ON DELETE SET NULL : si la transaction est supprimee,
-- la facture Gmail redevient disponible pour relier.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'fk_gmail_invoices_linked_transaction'
    ) THEN
        ALTER TABLE gmail_invoices
            ADD CONSTRAINT fk_gmail_invoices_linked_transaction
            FOREIGN KEY (linked_transaction_id)
            REFERENCES commerce_transactions(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gmail_invoices_linked_tx
    ON gmail_invoices (linked_transaction_id)
    WHERE linked_transaction_id IS NOT NULL;

COMMENT ON COLUMN gmail_invoices.linked_transaction_id IS
'FK vers commerce_transactions.id. Si NOT NULL, cette facture est consideree archivee/utilisee et est masquee de la liste des factures non classees disponibles a relier.';


-- ── Mise a jour de la vue v_unassigned ──────────────────────
DROP VIEW IF EXISTS v_unassigned;
CREATE VIEW v_unassigned AS
SELECT id, message_id, category, vendor_name,
       document_date, amount, currency, gmail_link, classification_confidence
FROM gmail_invoices
WHERE cerdia_company IS NULL
  AND linked_transaction_id IS NULL
  AND category IN ('FACTURE', 'RECU_PAIEMENT')
  AND deleted_at IS NULL
ORDER BY document_date DESC NULLS LAST;


-- ── Verification ────────────────────────────────────────────
SELECT 'gmail_invoices_total'           AS metric, COUNT(*)::TEXT AS value FROM gmail_invoices
UNION ALL
SELECT 'gmail_invoices_linked',                    COUNT(*)::TEXT          FROM gmail_invoices WHERE linked_transaction_id IS NOT NULL
UNION ALL
SELECT 'gmail_invoices_available_to_link',         COUNT(*)::TEXT          FROM gmail_invoices WHERE linked_transaction_id IS NULL AND deleted_at IS NULL AND category IN ('FACTURE','RECU_PAIEMENT','A_REVISER');
