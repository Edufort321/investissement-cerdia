-- ============================================================
-- Migration 100: gmail_invoices — CERDIA
-- Factures et reçus extraits de Gmail par l'IA (Claude Haiku)
-- ============================================================

-- Enable UUID extension (already active on Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Main table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gmail_invoices (
    id                         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Gmail identity
    message_id                 TEXT        NOT NULL UNIQUE,
    gmail_link                 TEXT,

    -- Classification
    category                   TEXT        NOT NULL
                                           CHECK (category IN ('FACTURE','RECU_PAIEMENT','DOC_PROJET','A_REVISER')),
    classification_confidence  NUMERIC(4,2),

    -- Extraction
    vendor_name                TEXT,
    document_date              DATE,
    document_number            TEXT,
    amount                     NUMERIC(14,2),
    currency                   TEXT        DEFAULT 'CAD'
                                           CHECK (currency IN ('CAD','USD','EUR','GBP','CHF')),
    payment_method             TEXT
                                           CHECK (payment_method IN ('credit_card','transfer','paypal','cash','other') OR payment_method IS NULL),
    is_paid                    BOOLEAN,
    extraction_confidence      NUMERIC(4,2),

    -- Manual assignment (from Excel dropdown → sync script)
    cerdia_company             TEXT
                                           CHECK (cerdia_company IN ('CERDIA Globale','CERDIA S.E.C.','Commerce CERDIA') OR cerdia_company IS NULL),

    -- File storage (local OneDrive path, semicolon-separated if multiple)
    file_path                  TEXT,

    -- Timestamps
    classified_at              TIMESTAMPTZ DEFAULT NOW(),
    synced_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gmail_invoices_category        ON gmail_invoices (category);
CREATE INDEX IF NOT EXISTS idx_gmail_invoices_document_date   ON gmail_invoices (document_date DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_invoices_vendor_name     ON gmail_invoices (vendor_name);
CREATE INDEX IF NOT EXISTS idx_gmail_invoices_cerdia_company  ON gmail_invoices (cerdia_company);
CREATE INDEX IF NOT EXISTS idx_gmail_invoices_currency        ON gmail_invoices (currency);
CREATE INDEX IF NOT EXISTS idx_gmail_invoices_synced_at       ON gmail_invoices (synced_at DESC);

-- ── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gmail_invoices_updated_at
    BEFORE UPDATE ON gmail_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE gmail_invoices ENABLE ROW LEVEL SECURITY;

-- Service role (Python sync script) — full access
CREATE POLICY "service_role_all" ON gmail_invoices
    FOR ALL
    USING (auth.role() = 'service_role');

-- Authenticated users (cerdia.ai app) — lecture
CREATE POLICY "authenticated_read" ON gmail_invoices
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users — update cerdia_company uniquement
CREATE POLICY "authenticated_update_company" ON gmail_invoices
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ── Helper views ─────────────────────────────────────────────

CREATE OR REPLACE VIEW v_factures AS
SELECT
    id, message_id, vendor_name, document_date, document_number,
    amount, currency, payment_method, is_paid,
    classification_confidence, extraction_confidence,
    cerdia_company, gmail_link, file_path, classified_at
FROM gmail_invoices
WHERE category = 'FACTURE'
ORDER BY document_date DESC NULLS LAST;

CREATE OR REPLACE VIEW v_recus AS
SELECT
    id, message_id, vendor_name, document_date, document_number,
    amount, currency, payment_method,
    classification_confidence, extraction_confidence,
    cerdia_company, gmail_link, file_path, classified_at
FROM gmail_invoices
WHERE category = 'RECU_PAIEMENT'
ORDER BY document_date DESC NULLS LAST;

-- Totaux mensuels par compagnie
CREATE OR REPLACE VIEW v_monthly_totals AS
SELECT
    cerdia_company,
    TO_CHAR(document_date, 'YYYY-MM')               AS month,
    category,
    COUNT(*)                                         AS count,
    SUM(amount) FILTER (WHERE currency = 'CAD')     AS total_cad,
    SUM(amount) FILTER (WHERE currency = 'USD')     AS total_usd
FROM gmail_invoices
WHERE category IN ('FACTURE', 'RECU_PAIEMENT')
  AND document_date IS NOT NULL
GROUP BY cerdia_company, TO_CHAR(document_date, 'YYYY-MM'), category
ORDER BY month DESC, cerdia_company;

-- Factures non encore assignées à une compagnie
CREATE OR REPLACE VIEW v_unassigned AS
SELECT
    id, message_id, category, vendor_name,
    document_date, amount, currency, gmail_link, classification_confidence
FROM gmail_invoices
WHERE cerdia_company IS NULL
  AND category IN ('FACTURE', 'RECU_PAIEMENT')
ORDER BY document_date DESC NULLS LAST;

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON TABLE  gmail_invoices IS 'Documents financiers Gmail classifiés par IA pour les compagnies CERDIA';
COMMENT ON COLUMN gmail_invoices.cerdia_company IS 'Assignation manuelle : CERDIA Globale | CERDIA S.E.C. | Commerce CERDIA';
COMMENT ON COLUMN gmail_invoices.file_path      IS 'Chemin OneDrive local, plusieurs fichiers séparés par ;';
COMMENT ON COLUMN gmail_invoices.gmail_link     IS 'Lien direct Gmail : https://mail.google.com/mail/u/0/#all/{message_id}';
