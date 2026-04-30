-- Migration 123: Table de contrôle mensuel des soldes
-- Enregistre chaque vérification de réconciliation (calculé vs relevé bancaire)

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 123: CONTRÔLE MENSUEL — monthly_verifications';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

CREATE TABLE IF NOT EXISTS monthly_verifications (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Période vérifiée
  period_start            DATE NOT NULL,
  period_end              DATE NOT NULL,

  -- Compte courant
  cc_opening_balance      DECIMAL(15,2) NOT NULL DEFAULT 0,
  cc_period_in            DECIMAL(15,2) NOT NULL DEFAULT 0,
  cc_period_out           DECIMAL(15,2) NOT NULL DEFAULT 0,
  cc_calculated_balance   DECIMAL(15,2) NOT NULL DEFAULT 0,
  cc_actual_balance       DECIMAL(15,2),           -- saisi manuellement
  cc_variance             DECIMAL(15,2),           -- calculé - réel

  -- CAPEX
  capex_opening_balance   DECIMAL(15,2) NOT NULL DEFAULT 0,
  capex_period_in         DECIMAL(15,2) NOT NULL DEFAULT 0,
  capex_period_out        DECIMAL(15,2) NOT NULL DEFAULT 0,
  capex_calculated_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  capex_actual_balance    DECIMAL(15,2),
  capex_variance          DECIMAL(15,2),

  -- Méta
  transaction_count       INTEGER NOT NULL DEFAULT 0,
  notes                   TEXT,
  status                  TEXT NOT NULL DEFAULT 'verified'
                            CHECK (status IN ('verified', 'discrepancy')),
  verified_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_verif_period ON monthly_verifications(period_start DESC, period_end DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_verif_unique_period ON monthly_verifications(period_start, period_end);

ALTER TABLE monthly_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage monthly_verifications"
  ON monthly_verifications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM investors WHERE investors.user_id = auth.uid()
      AND investors.access_level = 'admin'
  ));

CREATE POLICY "Investors view monthly_verifications"
  ON monthly_verifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM investors WHERE investors.user_id = auth.uid()
  ));

COMMENT ON TABLE monthly_verifications IS
  'Contrôle mensuel: solde calculé (transactions) vs solde réel (relevé bancaire)';

DO $$
BEGIN
  RAISE NOTICE '✅ Table monthly_verifications créée';
  RAISE NOTICE '✅ MIGRATION 123 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 123 — monthly_verifications créée' AS status;
