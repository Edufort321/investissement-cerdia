-- Migration 134: Compte de destination pour les transferts entre comptes

ALTER TABLE commerce_transactions
  ADD COLUMN IF NOT EXISTS transfer_to_account text;
