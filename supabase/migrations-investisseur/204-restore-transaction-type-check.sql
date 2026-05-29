-- Migration 204: RESTAURE la contrainte transactions_type_check
-- Contexte : une tentative de contrainte trop restrictive a laissé la table SANS
-- contrainte de type (le DROP réussit, le ADD échoue → 23514).
-- Cette migration reconstruit la contrainte de façon ROBUSTE :
--   liste canonique (migration 134) UNION tous les types réellement présents
--   dans les données → garantie qu'aucune ligne existante ne la viole.
-- Date: 2026-05-29

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

DO $$
DECLARE
  v_list text;
BEGIN
  SELECT string_agg(quote_literal(t), ', ')
    INTO v_list
  FROM (
    -- Types déjà présents dans les données (anti-violation)
    SELECT DISTINCT type AS t FROM transactions WHERE type IS NOT NULL
    UNION
    -- Liste canonique connue (migration 134) + type dividendes réinvestis
    -- (utilisé par handleDistributeDividends → type='reinvestissement_dividende')
    SELECT unnest(ARRAY[
      'investissement','paiement','depense','loyer','loyer_locatif','revenu',
      'dividende','reinvestissement_dividende','capex','maintenance','admin',
      'remboursement_investisseur','transfert','remboursement_pret','pret',
      'achat','vente','commission','frais','autre'
    ])
  ) s;

  EXECUTE format(
    'ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN (%s))',
    v_list
  );

  RAISE NOTICE '✅ MIGRATION 204 : contrainte transactions_type_check restaurée (% types)',
    (SELECT count(*) FROM (SELECT 1 FROM regexp_matches(v_list, ',', 'g')) x) + 1;
END $$;
