-- ==========================================
-- MIGRATION 18: TABLE INVESTOR INVESTMENTS
-- Système de parts (actions) pour investisseurs
-- ==========================================

-- Table pour historique des investissements (achats de parts)
CREATE TABLE IF NOT EXISTS public.investor_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_invested DECIMAL(15, 2) NOT NULL CHECK (amount_invested > 0),
  share_price_at_purchase DECIMAL(10, 4) NOT NULL CHECK (share_price_at_purchase > 0),
  number_of_shares DECIMAL(15, 4) NOT NULL CHECK (number_of_shares > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_investor_investments_investor_id
  ON public.investor_investments(investor_id);

CREATE INDEX IF NOT EXISTS idx_investor_investments_date
  ON public.investor_investments(investment_date DESC);

-- RLS (Row Level Security)
ALTER TABLE public.investor_investments ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs authentifiés peuvent tout faire
CREATE POLICY "Enable all access for authenticated users"
  ON public.investor_investments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_investor_investments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_investor_investments_updated_at
  BEFORE UPDATE ON public.investor_investments
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_investments_updated_at();

-- Vue pour résumé par investisseur
CREATE OR REPLACE VIEW public.investor_summary AS
SELECT
  i.id AS investor_id,
  CONCAT(i.first_name, ' ', i.last_name) AS investor_name,
  i.email,
  COUNT(ii.id) AS total_investments,
  COALESCE(SUM(ii.amount_invested), 0) AS total_amount_invested,
  COALESCE(SUM(ii.number_of_shares), 0) AS total_shares,
  COALESCE(AVG(ii.share_price_at_purchase), 0) AS average_purchase_price,
  MIN(ii.investment_date) AS first_investment_date,
  MAX(ii.investment_date) AS last_investment_date
FROM public.investors i
LEFT JOIN public.investor_investments ii ON i.id = ii.investor_id
GROUP BY i.id, i.first_name, i.last_name, i.email;

-- Commentaires
COMMENT ON TABLE public.investor_investments IS 'Historique des investissements (achats de parts) par investisseur';
COMMENT ON COLUMN public.investor_investments.amount_invested IS 'Montant investi en devise source';
COMMENT ON COLUMN public.investor_investments.share_price_at_purchase IS 'Prix par part au moment de l''achat (fixe historique)';
COMMENT ON COLUMN public.investor_investments.number_of_shares IS 'Nombre de parts achetées (calculé: amount_invested / share_price_at_purchase)';

-- Message de confirmation
SELECT '✅ Table investor_investments créée avec succès!' AS message;
