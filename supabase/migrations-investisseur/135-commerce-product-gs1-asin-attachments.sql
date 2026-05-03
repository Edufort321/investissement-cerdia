-- Migration 135: GS1, ASIN et pièces jointes sur commerce_products

ALTER TABLE commerce_products
  ADD COLUMN IF NOT EXISTS gs1_code text,
  ADD COLUMN IF NOT EXISTS asin text,
  ADD COLUMN IF NOT EXISTS product_attachments jsonb DEFAULT '[]'::jsonb;
