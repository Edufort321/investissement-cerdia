-- ============================================================
-- Migration 160 : invoices.module — separation investor vs commerce
--
-- Bug : dashboard/admin/factures et commerce/admin/factures partagent
-- la meme table `invoices`. Une facture creee dans Commerce apparait
-- dans Investisseur et vice-versa.
--
-- Fix : ajoute colonne `module` ('investor'|'commerce') qui permet a
-- chaque vue de filtrer ses factures.
--
-- Default 'investor' pour les rows existantes (cas historique CERDIA).
-- Eric peut UPDATE manuellement les factures Commerce existantes :
--   UPDATE invoices SET module='commerce' WHERE id='...';
-- ============================================================

BEGIN;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'investor'
        CHECK (module IN ('investor', 'commerce'));

CREATE INDEX IF NOT EXISTS idx_invoices_org_module
    ON invoices (organization_id, module);

COMMENT ON COLUMN invoices.module IS
'Module emetteur : investor (CERDIA SEC ou tenant cote investissement) ou commerce (Commerce CERDIA ou tenant cote eCommerce). Permet aux 2 onglets Factures distincts de filtrer leurs entrees.';

-- Verification
SELECT module, COUNT(*) FROM invoices GROUP BY module;

COMMIT;
