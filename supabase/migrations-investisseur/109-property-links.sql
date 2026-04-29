-- Migration 109: Table des hyperliens par projet
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS property_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('construction', 'photos', 'documents', 'general')),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_links_property_id ON property_links(property_id);

-- RLS
ALTER TABLE property_links ENABLE ROW LEVEL SECURITY;

-- Admins : accès complet
CREATE POLICY "Admins can manage property links"
  ON property_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM investors
      WHERE investors.user_id = auth.uid()
        AND investors.access_level = 'admin'
    )
  );

-- Investisseurs : lecture seule
CREATE POLICY "Investors can view property links"
  ON property_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investors
      WHERE investors.user_id = auth.uid()
    )
  );

COMMENT ON TABLE property_links IS 'Hyperliens associés à chaque projet (construction, photos investisseurs, documents)';
