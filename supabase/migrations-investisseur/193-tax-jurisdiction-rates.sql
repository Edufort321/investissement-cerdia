-- Migration 193 : Système fiscal multi-juridiction
-- Table configurable de taux par pays/juridiction + champs sur transactions
-- Couvre : Canada, États-Unis (FL + autres États), Rép. Dominicaine, Mexique
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

-- ══════════════════════════════════════════════════════════════════════
-- 1. Nouvelles colonnes sur transactions
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS tax_country          VARCHAR(2)     DEFAULT NULL,  -- CA US DO MX
  ADD COLUMN IF NOT EXISTS tax_state_province   VARCHAR(10)    DEFAULT NULL,  -- FL QC etc.
  ADD COLUMN IF NOT EXISTS rental_type          VARCHAR(20)    DEFAULT NULL,  -- short_term | long_term
  ADD COLUMN IF NOT EXISTS owner_fiscal_status  VARCHAR(30)    DEFAULT NULL,  -- resident | non_resident | foreign_entity
  ADD COLUMN IF NOT EXISTS is_furnished         BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_confotur          BOOLEAN        DEFAULT FALSE, -- Exonération DR Confotur
  ADD COLUMN IF NOT EXISTS sales_tax_amount     NUMERIC(12,2)  DEFAULT NULL,  -- Taxe de vente/TVA calculée
  ADD COLUMN IF NOT EXISTS state_income_tax_amt NUMERIC(12,2)  DEFAULT NULL,  -- Impôt État/Province calculé
  ADD COLUMN IF NOT EXISTS federal_withholding  NUMERIC(12,2)  DEFAULT NULL;  -- Retenue fédérale calculée

-- ══════════════════════════════════════════════════════════════════════
-- 2. Table des taux fiscaux par juridiction (configurable, versionnée)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tax_jurisdiction_rates (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               UUID REFERENCES organizations(id) ON DELETE CASCADE DEFAULT NULL,
  -- NULL = taux global (partagé) ; non-NULL = override tenant

  country_code                  VARCHAR(2)    NOT NULL,   -- CA US DO MX
  jurisdiction_level            VARCHAR(10)   NOT NULL,   -- federal state province county
  jurisdiction_code             VARCHAR(20)   NOT NULL,   -- ALL FL QC ORANGE_FL etc.
  jurisdiction_name             VARCHAR(100)  NOT NULL,

  -- Taxes de vente / TVA (sur le revenu brut, location court terme)
  sales_tax_rate                NUMERIC(5,2)  DEFAULT 0,  -- %
  sales_tax_short_term_days     INTEGER       DEFAULT NULL, -- seuil durée location (jours)

  -- Impôt sur le revenu État/Province (sur le revenu net ou brut selon le cas)
  income_tax_rate               NUMERIC(5,2)  DEFAULT NULL, -- NULL = pas d'impôt sur le revenu

  -- Retenue à la source non-résident (sur le brut, avant déductions)
  withholding_rate_nr           NUMERIC(5,2)  DEFAULT 0,   -- %

  -- TVA nationale (ITBIS DR / IVA MX)
  vat_rate                      NUMERIC(5,2)  DEFAULT 0,
  vat_applies_short_term        BOOLEAN       DEFAULT FALSE,
  vat_applies_furnished         BOOLEAN       DEFAULT FALSE,

  -- Déductions spéciales
  net_basis_election_available  BOOLEAN       DEFAULT FALSE, -- Option revenu net (US NR, Canada NR6)
  confotur_exemption_available  BOOLEAN       DEFAULT FALSE, -- DR seulement

  -- Deadline type de déclaration (pour affichage)
  filing_deadline_note          TEXT          DEFAULT NULL,

  effective_date                DATE          NOT NULL DEFAULT '2024-01-01',
  notes                         TEXT          DEFAULT NULL,
  created_at                    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_jurisdiction_rates_country
  ON tax_jurisdiction_rates(country_code, jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_tax_jurisdiction_rates_org
  ON tax_jurisdiction_rates(organization_id);

ALTER TABLE tax_jurisdiction_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_tax_jurisdiction_rates"
  ON tax_jurisdiction_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════
-- 3. Données initiales — taux 2024/2025 (à valider avec un CPA)
-- ══════════════════════════════════════════════════════════════════════

-- ─── CANADA ────────────────────────────────────────────────────────────
INSERT INTO tax_jurisdiction_rates
  (country_code, jurisdiction_level, jurisdiction_code, jurisdiction_name,
   sales_tax_rate, income_tax_rate, withholding_rate_nr, vat_rate,
   vat_applies_short_term, net_basis_election_available, filing_deadline_note, notes)
VALUES
  -- Fédéral Canada : retenue NR 25 % brut (réduit via NR6 pour net)
  ('CA','federal','FED','Canada Fédéral',
   0, NULL, 25, 5,
   TRUE, TRUE,
   '30 avril (formulaire T1 non-résident)',
   'GST 5 % sur locations court terme commerciales. Retenue 25 % sur loyer brut NR sauf NR6.'),
  -- Québec
  ('CA','province','QC','Québec',
   9.975, 14.5, 0, 9.975,
   TRUE, FALSE,
   '30 avril',
   'QST 9.975 %. Impôt provincial non-résident : 14,5 % sur le revenu net.'),
  -- Ontario
  ('CA','province','ON','Ontario',
   0, 11.16, 0, 0,
   FALSE, FALSE,
   '30 avril',
   'Pas de TVP provinciale sur loyers résidentiels. Impôt non-résident provincial ~11,16 %.'),
  -- Colombie-Britannique
  ('CA','province','BC','Colombie-Britannique',
   0, 12.29, 0, 0,
   FALSE, FALSE,
   '30 avril',
   'Impôt non-résident BC ~12,29 % sur le revenu net.'),
  -- Alberta (aucun impôt provincial sur le revenu)
  ('CA','province','AB','Alberta',
   0, NULL, 0, 0,
   FALSE, FALSE,
   '30 avril',
   'Alberta : aucun impôt provincial sur le revenu.')
ON CONFLICT DO NOTHING;

-- ─── ÉTATS-UNIS ────────────────────────────────────────────────────────
INSERT INTO tax_jurisdiction_rates
  (country_code, jurisdiction_level, jurisdiction_code, jurisdiction_name,
   sales_tax_rate, sales_tax_short_term_days, income_tax_rate,
   withholding_rate_nr, net_basis_election_available, filing_deadline_note, notes)
VALUES
  -- Fédéral US : 30 % NR brut (option net basis)
  ('US','federal','FED','United States Federal',
   0, NULL, NULL, 30,
   TRUE,
   'Form 1040-NR : 15 avril (ou 15 juin automatique pour non-résidents hors USA)',
   'Retenue FIRPTA 15 % à la vente. Option net basis (Schedule E) très avantageuse.'),
  -- Floride — 6 % state + pas d''impôt sur le revenu
  ('US','state','FL','Florida',
   6.0, 182, NULL, 0,
   FALSE,
   'Sales tax : mensuel ou trimestriel (DR-15). Pas de déclaration state income tax.',
   'Location ≤ 6 mois (182 j) assujettie à la taxe hôtelière. Comtés ajoutent 0–2,5 %.'),
  -- Floride — Orange County (Orlando/Kissimmee) : surtaxe comté 6 %
  ('US','county','FL_ORANGE','Orange County (Orlando)',
   6.0, 182, NULL, 0,
   FALSE,
   'Tourist Development Tax mensuelle (Orange County Tax Collector)',
   'Tourist Development Tax 6 % additionnelle sur taxe État = total 12 % environ.'),
  -- Floride — Osceola County (Kissimmee) : surtaxe comté 5 %
  ('US','county','FL_OSCEOLA','Osceola County (Kissimmee)',
   5.0, 182, NULL, 0,
   FALSE,
   'Tourist Development Tax mensuelle',
   'Surtaxe comté 5 % : total env. 11 % avec taxe État.'),
  -- Floride — Broward County (Fort Lauderdale) : surtaxe comté 1 %
  ('US','county','FL_BROWARD','Broward County',
   1.0, 182, NULL, 0,
   FALSE,
   'Tourist Development Tax mensuelle',
   'Surtaxe comté 1 % : total 7 %.'),
  -- New York
  ('US','state','NY','New York',
   4.0, 90, 6.85, 0,
   FALSE,
   'Form IT-203 (non-résident) : 15 avril',
   'Taxe État 4 %, plus city tax jusqu''à 4,5 % à NYC. Impôt NR 6,85 % min.'),
  -- Californie
  ('US','state','CA','California',
   0, NULL, 13.3, 0,
   FALSE,
   'Form 540NR : 15 avril',
   'Pas de sales tax sur locations résidentielles. Impôt revenu le plus élevé aux USA.'),
  -- Texas (sans impôt sur le revenu)
  ('US','state','TX','Texas',
   6.0, 30, NULL, 0,
   FALSE,
   'Pas de state income tax. Hotel Occupancy Tax mensuelle.',
   'Hotel Occupancy Tax 6 % état + taxes municipales. Pas d''impôt sur le revenu.'),
  -- Nevada
  ('US','state','NV','Nevada',
   0, NULL, NULL, 0,
   FALSE,
   'Pas de state income tax.',
   'Nevada : aucun impôt sur le revenu individuel.')
ON CONFLICT DO NOTHING;

-- ─── RÉPUBLIQUE DOMINICAINE ────────────────────────────────────────────
INSERT INTO tax_jurisdiction_rates
  (country_code, jurisdiction_level, jurisdiction_code, jurisdiction_name,
   income_tax_rate, withholding_rate_nr, vat_rate,
   vat_applies_short_term, confotur_exemption_available, filing_deadline_note, notes)
VALUES
  ('DO','federal','FED','République Dominicaine',
   25, 27, 18,
   TRUE, TRUE,
   'Déclaration annuelle IR-1 : 31 mars. Retenue à la source mensuelle.',
   'ITBIS 18 % sur locations touristiques court terme. Confotur : exonération 15 ans sur IR, IPI, transfert. Seuil IPI ~116 000 USD (exonéré en dessous).')
ON CONFLICT DO NOTHING;

-- ─── MEXIQUE ───────────────────────────────────────────────────────────
INSERT INTO tax_jurisdiction_rates
  (country_code, jurisdiction_level, jurisdiction_code, jurisdiction_name,
   income_tax_rate, withholding_rate_nr, vat_rate,
   vat_applies_furnished, filing_deadline_note, notes)
VALUES
  ('MX','federal','FED','México',
   25, 25, 16,
   TRUE,
   'Déclaration annuelle ISR : 30 avril. Paiements provisionnels ISR le 17/mois.',
   'ISR 25 % NR sur loyer brut (ou 30 % société étrangère). IVA 16 % si location meublée. Non meublé = exonéré IVA. Zone frontalière : IVA 8 %.')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- 4. Note finale
-- ══════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 193 OK';
  RAISE NOTICE '   transactions : +9 colonnes fiscales (tax_country, rental_type, etc.)';
  RAISE NOTICE '   tax_jurisdiction_rates : table créée + 17 juridictions pré-chargées';
  RAISE NOTICE '   IMPORTANT : Faire valider les taux par un CPA avant utilisation en production.';
END $$;
