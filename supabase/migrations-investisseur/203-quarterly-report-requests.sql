-- =====================================================
-- Migration 203 : investor_report_requests
-- Table pour les demandes de génération de rapports
-- trimestriels PDF par investisseur.
-- Date: 2026-05-28
-- =====================================================

-- ── 1. Ajouter 'rapport_trimestriel' au CHECK de documents ───────────────
--
-- La table documents a un CHECK type IN ('facture','recu','contrat','rapport','autre').
-- On ajoute 'rapport_trimestriel' en recréant la contrainte.
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_type_check
  CHECK (type IN ('facture', 'recu', 'contrat', 'rapport', 'rapport_trimestriel', 'autre'));

-- ── 2. Table investor_report_requests ────────────────────────────────────

CREATE TABLE IF NOT EXISTS investor_report_requests (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id     UUID        NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  fiscal_year     INTEGER     NOT NULL,
  quarter         INTEGER     NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'generating', 'done', 'error')),
  document_id     UUID        REFERENCES documents(id),
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_at    TIMESTAMPTZ,

  CONSTRAINT uq_investor_report_requests_investor_year_quarter
    UNIQUE (investor_id, fiscal_year, quarter)
);

-- Index pour les requêtes admin (liste par trimestre/statut)
CREATE INDEX IF NOT EXISTS idx_report_requests_period_status
  ON investor_report_requests (fiscal_year, quarter, status);

CREATE INDEX IF NOT EXISTS idx_report_requests_investor
  ON investor_report_requests (investor_id);

-- ── 3. RLS ───────────────────────────────────────────────────────────────

ALTER TABLE investor_report_requests ENABLE ROW LEVEL SECURITY;

-- Admin : accès complet
CREATE POLICY "admin_full_report_requests"
  ON investor_report_requests
  FOR ALL
  TO authenticated
  USING  (public.is_cerdia_admin(auth.uid()))
  WITH CHECK (public.is_cerdia_admin(auth.uid()));

-- Investisseur : lecture de ses propres demandes
CREATE POLICY "investor_read_own_report_requests"
  ON investor_report_requests
  FOR SELECT
  TO authenticated
  USING (
    investor_id = (
      SELECT id FROM investors
       WHERE user_id = auth.uid()
       LIMIT 1
    )
  );

-- ── 4. Confirmation ──────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ MIGRATION 203 : investor_report_requests';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Modifications :';
  RAISE NOTICE '  - documents.type : ajout de rapport_trimestriel';
  RAISE NOTICE '  - Table investor_report_requests créée';
  RAISE NOTICE '  - RLS : admin full + investor read-own';
  RAISE NOTICE '  - Index : (fiscal_year, quarter, status)';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
