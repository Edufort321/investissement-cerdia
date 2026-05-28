-- Migration 191 : Ajoute net_profit à commerce_products
-- Prix net revenant à CERDIA après frais Amazon, expédition, etc.
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

ALTER TABLE commerce_products
  ADD COLUMN IF NOT EXISTS net_profit numeric(10,2);
