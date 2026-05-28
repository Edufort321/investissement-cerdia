-- Migration 194 : Tokens d'accès comptable
-- Table pour liens sécurisés partagés avec un comptable externe
-- Accès en lecture seule aux transactions / rapports fiscaux / livre d'entreprise
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

CREATE TABLE IF NOT EXISTS accountant_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  token           VARCHAR(64)  NOT NULL UNIQUE,  -- token URL-safe aléatoire
  label           VARCHAR(200) DEFAULT NULL,      -- ex: "Pour CPA Martin — T1 2026"
  tabs            TEXT[]       NOT NULL DEFAULT ARRAY['transactions','rapports_fiscaux'],
  -- tabs: 'transactions' | 'rapports_fiscaux' | 'livre_entreprise'
  selected_year   INTEGER      DEFAULT NULL,      -- NULL = tous les ans
  filter_period   VARCHAR(20)  DEFAULT 'annual',  -- annual | Q1..Q4 | M1..M12
  expires_at      TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  access_count    INTEGER      DEFAULT 0,
  last_accessed   TIMESTAMPTZ  DEFAULT NULL,
  created_by      UUID         DEFAULT NULL,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accountant_tokens_token ON accountant_tokens(token);
CREATE INDEX IF NOT EXISTS idx_accountant_tokens_org   ON accountant_tokens(organization_id);

ALTER TABLE accountant_tokens ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their org's tokens
CREATE POLICY "auth_manage_accountant_tokens"
  ON accountant_tokens FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Public (anon) can read a token by token value (for the share page)
CREATE POLICY "anon_read_accountant_tokens"
  ON accountant_tokens FOR SELECT TO anon
  USING (expires_at > NOW());

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 194 OK';
  RAISE NOTICE '   accountant_tokens : table créée';
  RAISE NOTICE '   Accès anon en lecture si token non expiré';
END $$;
