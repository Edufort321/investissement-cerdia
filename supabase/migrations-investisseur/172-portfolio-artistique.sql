-- Migration 172: Portfolio Artistique
-- Tables pour le portfolio glamour d'artiste (modèle, actrice, etc.)
-- Usage: zone /commerce/admin + page publique /portfolio/[slug]

-- ── 1. Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolio_profiles (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text    NOT NULL UNIQUE,
  fill_token    uuid    NOT NULL DEFAULT gen_random_uuid(),
  name          text    NOT NULL,
  tagline       text,
  bio           text,
  headshot_url  text,
  cover_url     text,
  contact_email text,
  phone         text,
  instagram_url text,
  tiktok_url    text,
  location      text,
  is_published  boolean NOT NULL DEFAULT false,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid    NOT NULL REFERENCES portfolio_profiles(id) ON DELETE CASCADE,
  type          text    NOT NULL DEFAULT 'photo' CHECK (type IN ('photo','link','video')),
  title         text,
  description   text,
  url           text    NOT NULL,
  thumbnail_url text,
  category      text    DEFAULT 'portfolio' CHECK (category IN ('editorial','commercial','beauty','fashion','lifestyle','portfolio')),
  sort_order    int     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Index ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_portfolio_profiles_slug    ON portfolio_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_profiles_token   ON portfolio_profiles(fill_token);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_profile    ON portfolio_items(profile_id, sort_order);

-- ── 3. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE portfolio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items    ENABLE ROW LEVEL SECURITY;

-- Lecture publique des profils publiés (page publique /portfolio/[slug])
CREATE POLICY "portfolio_public_read" ON portfolio_profiles
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Admin org: tout gérer sur ses propres profils
CREATE POLICY "portfolio_org_manage" ON portfolio_profiles
  FOR ALL TO authenticated
  USING (organization_id = auth.jwt() ->> 'organization_id' OR public.is_cerdia_admin(auth.uid()))
  WITH CHECK (organization_id = auth.jwt() ->> 'organization_id' OR public.is_cerdia_admin(auth.uid()));

-- Super admin: tout voir
CREATE POLICY "portfolio_super_admin" ON portfolio_profiles
  FOR ALL TO authenticated
  USING (public.is_cerdia_admin(auth.uid()))
  WITH CHECK (public.is_cerdia_admin(auth.uid()));

-- Fill token: mise à jour via token (pour le lien de remplissage)
CREATE POLICY "portfolio_fill_token_update" ON portfolio_profiles
  FOR UPDATE TO anon, authenticated
  USING (true)  -- le filtre réel est fait par l'API (fill_token match)
  WITH CHECK (true);

-- portfolio_items: hérite via profile
CREATE POLICY "portfolio_items_public_read" ON portfolio_items
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolio_profiles pp
    WHERE pp.id = portfolio_items.profile_id AND pp.is_published = true
  ));

CREATE POLICY "portfolio_items_org_manage" ON portfolio_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM portfolio_profiles pp
    WHERE pp.id = portfolio_items.profile_id
      AND (pp.organization_id = auth.jwt() ->> 'organization_id' OR public.is_cerdia_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM portfolio_profiles pp
    WHERE pp.id = portfolio_items.profile_id
      AND (pp.organization_id = auth.jwt() ->> 'organization_id' OR public.is_cerdia_admin(auth.uid()))
  ));

-- Fill token items
CREATE POLICY "portfolio_items_fill_token" ON portfolio_items
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. Trigger updated_at ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_portfolio_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER portfolio_profiles_updated_at
  BEFORE UPDATE ON portfolio_profiles
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_updated_at();

-- ── 5. Confirmation ────────────────────────────────────────────────────────

DO $$ BEGIN
  RAISE NOTICE 'Migration 172: portfolio_profiles + portfolio_items créés avec RLS.';
END $$;
