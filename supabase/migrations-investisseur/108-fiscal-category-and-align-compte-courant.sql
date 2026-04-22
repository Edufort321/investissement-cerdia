-- ==========================================
-- MIGRATION 108: FISCAL_CATEGORY + ALIGNEMENT COMPTE COURANT
-- ==========================================
--
-- 1. Ajoute la colonne fiscal_category à transactions
--    Pour catégoriser OPEX / CAPEX / Admin / Revenus (rapports fiscaux T1135, T2209)
--
-- 2. Aligne get_financial_summary() avec calculate_realistic_nav_v2()
--    La version précédente utilisait les anciens types paiement/depense
--    Les nouveaux types sont: achat_propriete, capex, maintenance, admin, loyer
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 108: FISCAL_CATEGORY + ALIGNEMENT COMPTE COURANT';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ==========================================
-- 1. COLONNE fiscal_category
-- ==========================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS fiscal_category VARCHAR(50);

COMMENT ON COLUMN transactions.fiscal_category IS
  'Catégorie fiscale: OPEX (taxes_foncieres, assurances, frais_gestion, frais_condo, utilites, entretien_courant),
   CAPEX (renovation_majeure, equipements, ameliorations, ameublement, acquisition),
   ADMIN (honoraires_comptables, honoraires_juridiques, frais_constitutifs, frais_bancaires, autre_admin),
   REVENUS (loyer_court_terme, loyer_long_terme, loyer_autre)';

DO $$
BEGIN
  RAISE NOTICE '✅ Colonne fiscal_category ajoutée à transactions';
END $$;

-- ==========================================
-- 2. ALIGNER get_financial_summary() AVEC NAV
-- ==========================================
-- Anciens types (migration 95/98): paiement, depense
-- Nouveaux types (TransactionModal actuel): achat_propriete, capex, maintenance, admin, loyer, depense, remboursement_investisseur
-- Le compte courant doit être identique à cash_balance dans calculate_realistic_nav_v2()

DROP FUNCTION IF EXISTS get_financial_summary(integer);
DROP FUNCTION IF EXISTS get_financial_summary();

CREATE OR REPLACE FUNCTION get_financial_summary(p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
  result_category TEXT,
  result_metric    TEXT,
  result_value     NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY

  -- ── Total Investisseurs ─────────────────────────────────────────
  SELECT
    'investissement'::TEXT,
    'Total Investisseurs'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Compte Courant ──────────────────────────────────────────────
  -- Formule identique à calculate_realistic_nav_v2 cash_balance:
  --   + investissements
  --   + loyers
  --   − achat_propriete, capex, maintenance, admin, depense, remboursement
  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      -- Entrées
      COALESCE((
        SELECT SUM(t1.amount) FROM transactions t1
        WHERE t1.type IN ('investissement', 'loyer', 'dividende')
          AND t1.status != 'cancelled'
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)
      ), 0)
      -
      -- Sorties (toutes les sorties d'argent réelles)
      COALESCE((
        SELECT SUM(ABS(t2.amount)) FROM transactions t2
        WHERE t2.type IN (
            'achat_propriete', 'capex', 'maintenance', 'admin',
            'depense', 'remboursement_investisseur',
            -- Rétrocompatibilité anciens types
            'paiement'
          )
          AND t2.amount < 0
          AND t2.status != 'cancelled'
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)
      ), 0)
    )::NUMERIC

  UNION ALL

  -- ── CAPEX Réserve ───────────────────────────────────────────────
  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'capex'
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Dépenses Projets (toutes transactions liées à une propriété) ─
  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND t.amount < 0
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  -- ── Coûts Opération (dépenses sans propriété) ───────────────────
  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('maintenance', 'admin', 'depense')
    AND t.property_id IS NULL
    AND t.amount < 0
    AND t.status != 'cancelled'
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

COMMENT ON FUNCTION get_financial_summary(INTEGER) IS
  'KPIs financiers alignés avec calculate_realistic_nav_v2 (types: achat_propriete/capex/maintenance/admin/loyer)';

DO $$
BEGIN
  RAISE NOTICE '✅ get_financial_summary() réécrite — types alignés avec TransactionModal et NAV';
END $$;

-- ==========================================
-- VÉRIFICATION
-- ==========================================

DO $$
DECLARE
  v_col_exists BOOLEAN;
  v_result     RECORD;
BEGIN
  -- Vérifier colonne
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'fiscal_category'
  ) INTO v_col_exists;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION MIGRATION 108';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 fiscal_category dans transactions: %', v_col_exists;

  -- Tester get_financial_summary
  FOR v_result IN SELECT * FROM get_financial_summary(NULL) LOOP
    RAISE NOTICE '   • % = %', v_result.result_metric, v_result.result_value;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 108 TERMINÉE — fiscal_category ajouté + compte courant aligné' AS status;
