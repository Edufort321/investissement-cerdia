-- Migration 182: Add Portfolio Artistique as a commerce product
ALTER TABLE commerce_products ALTER COLUMN amazon_url DROP NOT NULL;

INSERT INTO commerce_products (title, description, price, currency, amazon_url, category, badge, active, sort_order)
VALUES (
  'Portfolio Artistique CERDIA',
  'Vitrine professionnelle pour artistes et modeles. Profil public, galerie photos, export PDF, partage reseaux sociaux.',
  150.00,
  'CAD',
  '',
  'Services numeriques',
  'Nouveau',
  true,
  0
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
