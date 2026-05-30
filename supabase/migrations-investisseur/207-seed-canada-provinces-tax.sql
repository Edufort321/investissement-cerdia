-- Migration 207 : Seed des provinces canadiennes dans tax_jurisdiction_rates
-- =====================================================================
-- Phase 1 multi-province Canada (volet immobilier). Ajoute les 13 provinces/
-- territoires comme juridictions provinciales sous le pays 'CA', en miroir de
-- lib/canada-tax.ts (utilisé par le module Commerce). Permet au module immobilier
-- de tracer les taxes de vente sur d'éventuels revenus locatifs AU CANADA.
--
-- Mapping des colonnes tax_jurisdiction_rates (migration 193) :
--   sales_tax_rate      = taxe provinciale (TVQ/PST/RST) OU TVH harmonisée
--   vat_rate            = 0 (le concept VAT/ITBIS ne s'applique pas au Canada)
--   withholding_rate_nr = 25 (retenue fédérale non-résident sur loyer brut, sauf NR6)
--   income_tax_rate     = NULL (impôt sur le revenu calculé séparément)
--
-- Le fédéral CA (GST 5 %) existe déjà (jurisdiction_code='FED', migration 193).
-- Idempotent via ON CONFLICT DO NOTHING.
-- ⚠️ Taux 2025/2026 — à faire valider par un CPA.
-- =====================================================================

INSERT INTO tax_jurisdiction_rates
  (country_code, jurisdiction_level, jurisdiction_code, jurisdiction_name,
   sales_tax_rate, income_tax_rate, withholding_rate_nr, vat_rate,
   vat_applies_short_term, net_basis_election_available, filing_deadline_note, notes)
VALUES
  ('CA','province','QC','Québec — TVQ',
   9.975, NULL, 0, 0, FALSE, TRUE,
   'TVQ : déclaration mensuelle/trimestrielle (Revenu Québec). T1 : 30 avril.',
   'TPS 5 % (fédéral) + TVQ 9,975 %. Combiné 14,975 %.'),
  ('CA','province','ON','Ontario — TVH',
   13.0, NULL, 0, 0, FALSE, TRUE,
   'TVH harmonisée 13 % (ARC). T1 : 30 avril.',
   'TVH 13 % (5 % fédéral + 8 % provincial harmonisé). Pas de TPS séparée.'),
  ('CA','province','BC','Colombie-Britannique — PST',
   7.0, NULL, 0, 0, FALSE, FALSE,
   'PST 7 % (déclaration provinciale BC) + TPS 5 % fédérale.',
   'TPS 5 % + PST 7 % = 12 %.'),
  ('CA','province','AB','Alberta',
   0, NULL, 0, 0, FALSE, FALSE,
   'TPS 5 % seulement. Aucune taxe de vente provinciale.',
   'Alberta : pas de taxe de vente provinciale.'),
  ('CA','province','SK','Saskatchewan — PST',
   6.0, NULL, 0, 0, FALSE, FALSE,
   'PST 6 % + TPS 5 %.',
   'TPS 5 % + PST 6 % = 11 %.'),
  ('CA','province','MB','Manitoba — RST',
   7.0, NULL, 0, 0, FALSE, FALSE,
   'RST 7 % (taxe de vente au détail) + TPS 5 %.',
   'TPS 5 % + RST 7 % = 12 %.'),
  ('CA','province','NB','Nouveau-Brunswick — TVH',
   15.0, NULL, 0, 0, FALSE, FALSE,
   'TVH harmonisée 15 %.',
   'TVH 15 % (5 % fédéral + 10 % provincial harmonisé).'),
  ('CA','province','NL','Terre-Neuve-et-Labrador — TVH',
   15.0, NULL, 0, 0, FALSE, FALSE,
   'TVH harmonisée 15 %.',
   'TVH 15 %.'),
  ('CA','province','NS','Nouvelle-Écosse — TVH',
   14.0, NULL, 0, 0, FALSE, FALSE,
   'TVH harmonisée 14 % (depuis avril 2025).',
   'TVH 14 % (réduite de 15 % à 14 % en avril 2025).'),
  ('CA','province','PE','Île-du-Prince-Édouard — TVH',
   15.0, NULL, 0, 0, FALSE, FALSE,
   'TVH harmonisée 15 %.',
   'TVH 15 %.'),
  ('CA','territory','NT','Territoires du Nord-Ouest',
   0, NULL, 0, 0, FALSE, FALSE,
   'TPS 5 % seulement.',
   'Aucune taxe de vente territoriale.'),
  ('CA','territory','NU','Nunavut',
   0, NULL, 0, 0, FALSE, FALSE,
   'TPS 5 % seulement.',
   'Aucune taxe de vente territoriale.'),
  ('CA','territory','YT','Yukon',
   0, NULL, 0, 0, FALSE, FALSE,
   'TPS 5 % seulement.',
   'Aucune taxe de vente territoriale.')
ON CONFLICT DO NOTHING;

-- Confirmation (SELECT — pas de RAISE pour éviter l'erreur 42601).
SELECT
  'Provinces CA seedées' AS resultat,
  COUNT(*) FILTER (WHERE country_code = 'CA' AND jurisdiction_level IN ('province','territory')) AS nb_provinces_ca
FROM tax_jurisdiction_rates;
