-- ============================================================
-- Migration 143 : table commerce_platforms (fournisseurs recurrents)
--
-- Persiste les plateformes/fournisseurs utilises dans le formulaire
-- des transactions commerce, pour qu'ils restent disponibles dans
-- une liste deroulante meme si toutes les transactions qui les
-- utilisent sont supprimees.
-- ============================================================

CREATE TABLE IF NOT EXISTS commerce_platforms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_commerce_platforms_name ON commerce_platforms (lower(name));

COMMENT ON TABLE commerce_platforms IS
'Liste des plateformes/fournisseurs disponibles dans le formulaire de transactions commerce. Persiste les entrees recurrentes.';


-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE commerce_platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_rw_commerce_platforms" ON commerce_platforms;
CREATE POLICY "admin_rw_commerce_platforms" ON commerce_platforms
    FOR ALL TO authenticated
    USING (public.is_cerdia_admin(auth.uid()))
    WITH CHECK (public.is_cerdia_admin(auth.uid()));


-- ── Seed avec les valeurs hardcodees historiques + les valeurs deja
-- presentes dans commerce_transactions.platform ────────────────
INSERT INTO commerce_platforms (name)
VALUES ('Amazon'), ('Shopify'), ('Etsy'), ('Site web'), ('Autre')
ON CONFLICT (name) DO NOTHING;

INSERT INTO commerce_platforms (name)
SELECT DISTINCT platform
  FROM commerce_transactions
 WHERE platform IS NOT NULL
   AND TRIM(platform) <> ''
ON CONFLICT (name) DO NOTHING;


-- ── Verification ────────────────────────────────────────────
SELECT 'platforms_total' AS metric, COUNT(*)::TEXT AS value FROM commerce_platforms;
