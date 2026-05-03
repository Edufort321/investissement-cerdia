-- Migration 133: Catégorie fiscale + pièces jointes sur commerce_transactions

ALTER TABLE commerce_transactions
  ADD COLUMN IF NOT EXISTS fiscal_category text DEFAULT 'opex_autre',
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_storage_path text;
