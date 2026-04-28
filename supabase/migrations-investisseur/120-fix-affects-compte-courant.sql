-- ==========================================
-- MIGRATION 120: Respecter affects_compte_courant dans les vues
-- ==========================================
-- Problème: v_compte_courant_monthly et compte_courant_mensuel filtrent
-- uniquement par type de transaction et ignorent la colonne
-- affects_compte_courant. Quand un investisseur paie une dépense avec
-- sa propre carte (investor_payment_type='achat_parts'), affects_compte_courant
-- est mis à FALSE par le frontend, mais la vue déduisait quand même du compte courant.
--
-- Fix: ajouter (affects_compte_courant IS NOT FALSE) dans tous les
-- prédicats WHERE — NULL est traité comme TRUE pour la rétrocompatibilité.
-- ==========================================

-- ── 1. v_compte_courant_monthly ────────────────────────────────────────────

CREATE OR REPLACE VIEW v_compte_courant_monthly AS
SELECT
  EXTRACT(YEAR  FROM date)::INTEGER AS year,
  EXTRACT(MONTH FROM date)::INTEGER AS month,
  TO_CHAR(date, 'YYYY-MM')          AS period,

  -- Entrées
  COALESCE(SUM(CASE
    WHEN type IN ('investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende')
     AND (affects_compte_courant IS NOT FALSE)
    THEN ABS(amount)
    ELSE 0
  END), 0) AS total_inflow,

  -- Sorties (seulement si affects_compte_courant n'est pas explicitement FALSE)
  COALESCE(SUM(CASE
    WHEN type IN (
      'paiement', 'achat_propriete', 'capex', 'maintenance',
      'admin', 'depense', 'remboursement_investisseur', 'courant', 'rnd'
    )
     AND (affects_compte_courant IS NOT FALSE)
    THEN ABS(amount)
    ELSE 0
  END), 0) AS total_outflow,

  -- Balance nette
  COALESCE(SUM(CASE
    WHEN type IN ('investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende')
     AND (affects_compte_courant IS NOT FALSE)
    THEN ABS(amount)
    WHEN type IN (
      'paiement', 'achat_propriete', 'capex', 'maintenance',
      'admin', 'depense', 'remboursement_investisseur', 'courant', 'rnd'
    )
     AND (affects_compte_courant IS NOT FALSE)
    THEN -ABS(amount)
    ELSE 0
  END), 0) AS net_balance,

  COALESCE(SUM(CASE WHEN category = 'operation'   AND (affects_compte_courant IS NOT FALSE) THEN ABS(amount) ELSE 0 END), 0) AS cout_operation,
  COALESCE(SUM(CASE WHEN category = 'maintenance' AND (affects_compte_courant IS NOT FALSE) THEN ABS(amount) ELSE 0 END), 0) AS cout_maintenance,
  COALESCE(SUM(CASE WHEN category = 'admin'       AND (affects_compte_courant IS NOT FALSE) THEN ABS(amount) ELSE 0 END), 0) AS cout_admin,
  COALESCE(SUM(CASE WHEN category = 'projet'      AND (affects_compte_courant IS NOT FALSE) THEN ABS(amount) ELSE 0 END), 0) AS cout_projet,

  COUNT(*) AS transaction_count

FROM transactions
WHERE status != 'cancelled'
GROUP BY
  EXTRACT(YEAR  FROM date),
  EXTRACT(MONTH FROM date),
  TO_CHAR(date, 'YYYY-MM')
ORDER BY year DESC, month DESC;

COMMENT ON VIEW v_compte_courant_monthly IS
  'Compte courant mensuel — respecte affects_compte_courant (migration 120)';

-- ── 2. v_compte_courant_yearly ─────────────────────────────────────────────
-- (dérivée de v_compte_courant_monthly, pas de changement nécessaire ici)

CREATE OR REPLACE VIEW v_compte_courant_yearly AS
SELECT
  year,
  SUM(total_inflow)      AS total_inflow,
  SUM(total_outflow)     AS total_outflow,
  SUM(net_balance)       AS net_balance,
  SUM(cout_operation)    AS cout_operation,
  SUM(cout_maintenance)  AS cout_maintenance,
  SUM(cout_admin)        AS cout_admin,
  SUM(cout_projet)       AS cout_projet,
  SUM(transaction_count) AS transaction_count
FROM v_compte_courant_monthly
GROUP BY year
ORDER BY year DESC;

-- ── 3. compte_courant_mensuel (ancienne vue migration 10) ──────────────────

CREATE OR REPLACE VIEW compte_courant_mensuel AS
SELECT
  EXTRACT(YEAR  FROM t.date)::INTEGER AS year,
  EXTRACT(MONTH FROM t.date)::INTEGER AS month,

  COALESCE(SUM(CASE
    WHEN operation_type = 'revenu' AND (affects_compte_courant IS NOT FALSE)
    THEN amount ELSE 0
  END), 0) AS total_revenues,

  COALESCE(SUM(CASE
    WHEN operation_type = 'cout_operation' AND (affects_compte_courant IS NOT FALSE)
    THEN amount ELSE 0
  END), 0) AS total_operational_costs,

  COALESCE(SUM(CASE
    WHEN operation_type = 'depense_projet' AND (affects_compte_courant IS NOT FALSE)
    THEN amount ELSE 0
  END), 0) AS total_project_expenses,

  COALESCE(SUM(CASE
    WHEN operation_type = 'revenu' AND type = 'dividende' AND (affects_compte_courant IS NOT FALSE)
    THEN amount ELSE 0
  END), 0) AS rental_income,

  COALESCE(SUM(CASE
    WHEN operation_type = 'revenu' AND type != 'dividende' AND (affects_compte_courant IS NOT FALSE)
    THEN amount ELSE 0
  END), 0) AS other_income,

  COALESCE(SUM(CASE WHEN project_category = 'management'   AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS management_fees,
  COALESCE(SUM(CASE WHEN project_category = 'utilities'    AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS utilities,
  COALESCE(SUM(CASE WHEN project_category = 'insurance'    AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS insurance,
  COALESCE(SUM(CASE WHEN project_category = 'maintenance'  AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS maintenance,
  COALESCE(SUM(CASE WHEN project_category = 'property_tax' AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS property_taxes,
  COALESCE(SUM(CASE WHEN project_category = 'renovation'   AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS renovation_costs,
  COALESCE(SUM(CASE WHEN project_category = 'furnishing'   AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS furnishing_costs,
  COALESCE(SUM(CASE WHEN project_category = 'other_project' AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0) AS other_project_costs,

  (
    COALESCE(SUM(CASE WHEN operation_type = 'revenu' AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN operation_type = 'cout_operation' AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN operation_type = 'depense_projet' AND (affects_compte_courant IS NOT FALSE) THEN amount ELSE 0 END), 0)
  ) AS net_income,

  COUNT(*) AS nombre_transactions,
  MAX(t.updated_at) AS derniere_mise_a_jour

FROM transactions t
GROUP BY EXTRACT(YEAR FROM t.date), EXTRACT(MONTH FROM t.date)
ORDER BY year DESC, month DESC;

COMMENT ON VIEW compte_courant_mensuel IS
  'Compte courant mensuel — respecte affects_compte_courant (migration 120)';

-- ── 4. get_financial_summary : ajouter le filtre ───────────────────────────

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

  SELECT
    'investissement'::TEXT,
    'Total Investisseurs'::TEXT,
    COALESCE(SUM(t.amount), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'investissement'
    AND t.status != 'cancelled'
    AND (affects_compte_courant IS NOT FALSE)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  SELECT
    'compte_courant'::TEXT,
    'Compte Courant Balance'::TEXT,
    (
      COALESCE((
        SELECT SUM(t1.amount) FROM transactions t1
        WHERE t1.type IN ('investissement', 'loyer', 'dividende')
          AND t1.status != 'cancelled'
          AND (t1.affects_compte_courant IS NOT FALSE)
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t1.date)::INTEGER = p_year)
      ), 0)
      -
      COALESCE((
        SELECT SUM(ABS(t2.amount)) FROM transactions t2
        WHERE t2.type IN (
            'achat_propriete', 'capex', 'maintenance', 'admin',
            'depense', 'remboursement_investisseur', 'paiement'
          )
          AND t2.amount < 0
          AND t2.status != 'cancelled'
          AND (t2.affects_compte_courant IS NOT FALSE)
          AND (p_year IS NULL OR EXTRACT(YEAR FROM t2.date)::INTEGER = p_year)
      ), 0)
    )::NUMERIC

  UNION ALL

  SELECT
    'capex'::TEXT,
    'CAPEX Réserve'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type = 'capex'
    AND t.status != 'cancelled'
    AND (affects_compte_courant IS NOT FALSE)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  SELECT
    'projet'::TEXT,
    'Dépenses Projets'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.property_id IS NOT NULL
    AND t.amount < 0
    AND t.status != 'cancelled'
    AND (affects_compte_courant IS NOT FALSE)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year)

  UNION ALL

  SELECT
    'operation'::TEXT,
    'Coûts Opération'::TEXT,
    COALESCE(SUM(ABS(t.amount)), 0)::NUMERIC
  FROM transactions t
  WHERE t.type IN ('maintenance', 'admin', 'depense')
    AND t.property_id IS NULL
    AND t.amount < 0
    AND t.status != 'cancelled'
    AND (affects_compte_courant IS NOT FALSE)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM t.date)::INTEGER = p_year);
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 120: affects_compte_courant respecté dans:';
  RAISE NOTICE '   • v_compte_courant_monthly';
  RAISE NOTICE '   • v_compte_courant_yearly';
  RAISE NOTICE '   • compte_courant_mensuel';
  RAISE NOTICE '   • get_financial_summary()';
  RAISE NOTICE '   NULL = TRUE (rétrocompatibilité), FALSE = exclu du compte courant';
END $$;
