-- Migration 128: Multiple images for commerce products
ALTER TABLE commerce_products ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Migrate existing single image_url into the array
UPDATE commerce_products
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url != '' AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Fix any products that may have been saved with active = NULL (treat as true)
UPDATE commerce_products SET active = true WHERE active IS NULL;
