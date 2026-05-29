-- Migration 202: Dividend declarations + investor elections (Cash vs Reinvest)
-- Supports year-end investor profile, election of reinvestment, and history tracking

-- ── dividend_declarations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dividend_declarations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL DEFAULT 'c0000000-0000-0000-0000-000000000001'::uuid,
  fiscal_year       INTEGER NOT NULL,
  declaration_date  DATE NOT NULL,
  total_amount      NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  nav_per_share     NUMERIC(14,6) NOT NULL CHECK (nav_per_share > 0),
  total_shares      NUMERIC(14,6) NOT NULL CHECK (total_shares > 0),
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'elected', 'executed')),
  notes             TEXT,
  executed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── dividend_investor_elections ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dividend_investor_elections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id    UUID NOT NULL REFERENCES public.dividend_declarations(id) ON DELETE CASCADE,
  investor_id       UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  investor_shares   NUMERIC(14,6) NOT NULL CHECK (investor_shares >= 0),
  ownership_pct     NUMERIC(8,6) NOT NULL CHECK (ownership_pct >= 0),
  dividend_amount   NUMERIC(14,2) NOT NULL CHECK (dividend_amount >= 0),
  election          TEXT NOT NULL DEFAULT 'cash' CHECK (election IN ('cash', 'reinvest')),
  -- Reinvestment details (populated on execution)
  shares_issued     NUMERIC(14,6),           -- new shares = dividend_amount / nav_per_share
  reinvest_transaction_id UUID,              -- transaction type='reinvestissement_dividende'
  cash_transaction_id     UUID,              -- transaction type='dividende'
  t5_issued         BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,
  elected_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (declaration_id, investor_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_div_decl_org_year
  ON public.dividend_declarations (organization_id, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_div_elec_declaration
  ON public.dividend_investor_elections (declaration_id);

CREATE INDEX IF NOT EXISTS idx_div_elec_investor
  ON public.dividend_investor_elections (investor_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.dividend_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividend_investor_elections ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_div_decl" ON public.dividend_declarations
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM investors WHERE action_class IN ('admin','B','C')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM investors WHERE action_class IN ('admin','B','C')));

-- Investor: read their own elections
CREATE POLICY "investor_read_div_elec" ON public.dividend_investor_elections
  FOR SELECT TO authenticated
  USING (investor_id IN (SELECT id FROM investors WHERE user_id = auth.uid()));

-- Admin: full access on elections
CREATE POLICY "admin_div_elec" ON public.dividend_investor_elections
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM investors WHERE action_class IN ('admin','B','C')))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM investors WHERE action_class IN ('admin','B','C')));

-- ── updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_dividend()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_div_decl_updated_at
  BEFORE UPDATE ON public.dividend_declarations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_dividend();

CREATE TRIGGER trg_div_elec_updated_at
  BEFORE UPDATE ON public.dividend_investor_elections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_dividend();

COMMENT ON TABLE public.dividend_declarations IS 'Year-end dividend declarations with NAV/share and total amount';
COMMENT ON TABLE public.dividend_investor_elections IS 'Per-investor election: Cash payout or Reinvestment into new shares';
COMMENT ON COLUMN public.dividend_investor_elections.election IS 'cash = wire to investor; reinvest = new shares at nav_per_share (T5 issued either way)';
COMMENT ON COLUMN public.dividend_investor_elections.shares_issued IS 'New shares = dividend_amount / nav_per_share (set on execution)';
