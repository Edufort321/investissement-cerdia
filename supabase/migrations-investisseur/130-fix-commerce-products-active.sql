-- Migration 130: Fix commerce_products active column
-- Products created while session was expired were saved with active = null or false.
-- This makes them invisible on the public /commerce page (filter: active !== false).

UPDATE commerce_products
SET active = true
WHERE active IS NULL OR active = false;
