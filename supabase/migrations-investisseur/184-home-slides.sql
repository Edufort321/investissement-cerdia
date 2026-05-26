-- Migration 184 : table home_slides pour le carrousel de la page d'accueil
CREATE TABLE IF NOT EXISTS home_slides (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   text        NOT NULL,
  flag        text        NOT NULL DEFAULT '🌍',
  location    text        NOT NULL,
  sub         text,
  stat        text,
  label_fr    text        NOT NULL DEFAULT 'rendement locatif annuel',
  label_en    text        NOT NULL DEFAULT 'annual rental yield',
  active      boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE home_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_slides_public_read"
  ON home_slides FOR SELECT USING (true);

CREATE POLICY "home_slides_auth_write"
  ON home_slides FOR ALL USING (auth.role() = 'authenticated');
