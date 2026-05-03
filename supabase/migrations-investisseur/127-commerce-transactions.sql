-- Migration 127: Transactions Commerce CERDIA
CREATE TABLE IF NOT EXISTS commerce_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  type text NOT NULL DEFAULT 'vente',  -- vente | remboursement | frais_amazon | publicite | autre
  platform text DEFAULT 'Amazon',       -- Amazon | Shopify | Etsy | Autre
  product_ref text,
  status text DEFAULT 'complété',       -- complété | en attente | annulé
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_tx_date ON commerce_transactions(date);
CREATE INDEX IF NOT EXISTS idx_commerce_tx_type ON commerce_transactions(type);

ALTER TABLE commerce_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read commerce_transactions" ON commerce_transactions
  FOR SELECT USING (true);

CREATE POLICY "Auth write commerce_transactions" ON commerce_transactions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER update_commerce_transactions_updated_at
  BEFORE UPDATE ON commerce_transactions
  FOR EACH ROW EXECUTE FUNCTION update_invoice_updated_at();
