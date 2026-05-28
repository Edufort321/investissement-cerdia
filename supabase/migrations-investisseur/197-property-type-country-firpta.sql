-- Migration 197 : Type de propriété, code pays, FIRPTA, CCA
-- properties : property_type, country_code, state_province, county_code, FIRPTA, CCA class
-- scenarios  : property_type (pour transfert lors de la conversion)
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- ─────────────────────────────────────────────────────────────
-- A. TABLE properties — nouveaux champs
-- ─────────────────────────────────────────────────────────────

-- Type de propriété (immobilier résidentiel, commercial, terrain, etc.)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(20) DEFAULT 'condo';
-- Valeurs : 'condo' | 'maison' | 'terrain' | 'commercial' | 'multiplex' | 'condo_hotel' | 'chalet' | 'preconstruction'

-- Localisation fiscale structurée (dérivée du scénario ou saisie manuelle)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS country_code    VARCHAR(2)  DEFAULT NULL,  -- CA US DO MX
  ADD COLUMN IF NOT EXISTS state_province  VARCHAR(10) DEFAULT NULL,  -- FL QC ON BC etc.
  ADD COLUMN IF NOT EXISTS county_code     VARCHAR(20) DEFAULT NULL;  -- FL-MIAMI FL-ORANGE etc.

-- FIRPTA — Retenue à la source USA (15% prix de vente, Form 8288 dans 20 jours)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS firpta_withholding_pct       NUMERIC(5,2)  DEFAULT 15,
  -- 15% pour ventes ≥ $300K, réduit possible si résidence principale acheteur
  ADD COLUMN IF NOT EXISTS firpta_withholding_amount    NUMERIC(12,2) DEFAULT NULL,
  -- Montant calculé automatiquement ou saisi manuellement
  ADD COLUMN IF NOT EXISTS firpta_form_8288_submitted   BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS firpta_withholding_refunded  BOOLEAN       DEFAULT FALSE;
  -- TRUE si remboursement via 1040-NR (impôt réel < FIRPTA retenu)

-- CCA / DPA — Déduction pour amortissement (immobilier Canada uniquement)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS cca_class VARCHAR(8) DEFAULT NULL;
  -- 'Class1' (4% bâtiment) | 'Class8' (20% ameublement) | 'Class13' (location court terme)

-- ─────────────────────────────────────────────────────────────
-- B. TABLE scenarios — property_type pour transfert à la conversion
-- ─────────────────────────────────────────────────────────────
ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(20) DEFAULT 'condo';

-- ─────────────────────────────────────────────────────────────
-- C. Dérivation country_code depuis les données existantes
-- ─────────────────────────────────────────────────────────────

-- Propriétés : dériver country_code depuis la localisation / devise
UPDATE properties
SET country_code =
  CASE
    WHEN LOWER(location) LIKE ANY(ARRAY['%florida%','%miami%','%orlando%','%kissimmee%','%fort lauderdale%','%usa%','%united states%','%etats-unis%']) THEN 'US'
    WHEN LOWER(location) LIKE ANY(ARRAY['%dominicaine%','%dominican%','%bavaro%','%punta cana%','%santo domingo%','%cabarete%','%samana%']) THEN 'DO'
    WHEN LOWER(location) LIKE ANY(ARRAY['%mexique%','%mexico%','%cancun%','%playa del carmen%','%tulum%']) THEN 'MX'
    WHEN currency = 'CAD' OR LOWER(location) LIKE ANY(ARRAY['%québec%','%ontario%','%montréal%','%toronto%','%canada%']) THEN 'CA'
    WHEN currency = 'USD' THEN 'US'  -- Fallback : USD → présumer USA
    WHEN currency = 'DOP' THEN 'DO'
    WHEN currency = 'MXN' THEN 'MX'
    ELSE NULL
  END
WHERE country_code IS NULL;

-- Scénarios : dériver property_type depuis les données existantes (best effort)
-- (Les scénarios seront mis à jour par l'UI dès la prochaine édition)
UPDATE scenarios
SET property_type = 'condo'
WHERE property_type IS NULL;

-- ─────────────────────────────────────────────────────────────
-- D. Calcul automatique firpta_withholding_amount pour propriétés US vendues
-- ─────────────────────────────────────────────────────────────
UPDATE properties
SET firpta_withholding_amount = ROUND(sale_price * firpta_withholding_pct / 100, 2)
WHERE country_code = 'US'
  AND status = 'vendu'
  AND sale_price > 0
  AND firpta_withholding_amount IS NULL;

-- ─────────────────────────────────────────────────────────────
-- E. Index pour filtres fiscaux fréquents
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_properties_country_code   ON properties(country_code);
CREATE INDEX IF NOT EXISTS idx_properties_property_type  ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_scenarios_property_type   ON scenarios(property_type);

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 197 OK';
  RAISE NOTICE '   properties : property_type, country_code, state_province, county_code';
  RAISE NOTICE '   properties : firpta_withholding_pct/amount/form_8288_submitted/refunded';
  RAISE NOTICE '   properties : cca_class (déduction pour amortissement Canada)';
  RAISE NOTICE '   scenarios  : property_type (transfert lors conversion → projet)';
  RAISE NOTICE '   country_code déduit automatiquement depuis location/currency existants';
  RAISE NOTICE '   firpta_withholding_amount calculé pour propriétés US vendues existantes';
END $$;
