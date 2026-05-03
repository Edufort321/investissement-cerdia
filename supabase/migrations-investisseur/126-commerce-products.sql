-- Migration 126: Table des produits Commerce CERDIA (Amazon)
CREATE TABLE IF NOT EXISTS commerce_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  price numeric(10,2),
  currency text DEFAULT 'CAD',
  amazon_url text NOT NULL,
  image_url text,
  badge text,       -- ex: 'Nouveau', 'Bestseller', 'Populaire', 'Promo'
  category text,
  rating numeric(3,1) DEFAULT 0,
  review_count integer DEFAULT 0,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_products_active ON commerce_products(active);
CREATE INDEX IF NOT EXISTS idx_commerce_products_sort ON commerce_products(sort_order);

ALTER TABLE commerce_products ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Public read commerce_products" ON commerce_products
  FOR SELECT USING (active = true);

-- Écriture authentifiée
CREATE POLICY "Auth write commerce_products" ON commerce_products
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger updated_at
CREATE TRIGGER update_commerce_products_updated_at
  BEFORE UPDATE ON commerce_products
  FOR EACH ROW EXECUTE FUNCTION update_invoice_updated_at();
