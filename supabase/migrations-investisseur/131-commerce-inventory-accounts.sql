-- Migration 131: Inventory for products + account field for transactions

ALTER TABLE commerce_products
  ADD COLUMN IF NOT EXISTS inventory integer DEFAULT 0;

ALTER TABLE commerce_transactions
  ADD COLUMN IF NOT EXISTS account text DEFAULT 'compte_courant';
