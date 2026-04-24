-- Migration 118: Corriger v_compte_courant_monthly
--
-- Problème: la vue classifie par signe du montant (amount > 0 = entrée).
-- Mais la plupart des transactions sont enregistrées en valeur absolue positive,
-- ce qui fait apparaître les paiements comme des entrées.
--
-- Fix: classification par TYPE (comme get_financial_summary), pas par signe.
-- Inflows  : investissement, loyer, loyer_locatif, revenu, dividende
-- Outflows : paiement, achat_propriete, capex, maintenance, admin,
--            depense, remboursement_investisseur, courant, rnd

CREATE OR REPLACE VIEW v_compte_courant_monthly AS
SELECT
  EXTRACT(YEAR  FROM date)::INTEGER AS year,
  EXTRACT(MONTH FROM date)::INTEGER AS month,
  TO_CHAR(date, 'YYYY-MM')          AS period,

  -- Entrées: types qui représentent de l'argent entrant
  COALESCE(SUM(CASE
    WHEN type IN ('investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende')
    THEN ABS(amount)
    ELSE 0
  END), 0) AS total_inflow,

  -- Sorties: types qui représentent de l'argent sortant
  COALESCE(SUM(CASE
    WHEN type IN (
      'paiement', 'achat_propriete', 'capex', 'maintenance',
      'admin', 'depense', 'remboursement_investisseur', 'courant', 'rnd'
    )
    THEN ABS(amount)
    ELSE 0
  END), 0) AS total_outflow,

  -- Balance nette: entrées − sorties
  COALESCE(SUM(CASE
    WHEN type IN ('investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende')
    THEN ABS(amount)
    WHEN type IN (
      'paiement', 'achat_propriete', 'capex', 'maintenance',
      'admin', 'depense', 'remboursement_investisseur', 'courant', 'rnd'
    )
    THEN -ABS(amount)
    ELSE 0
  END), 0) AS net_balance,

  -- Détails des coûts (catégories)
  COALESCE(SUM(CASE WHEN category = 'operation'   THEN ABS(amount) ELSE 0 END), 0) AS cout_operation,
  COALESCE(SUM(CASE WHEN category = 'maintenance' THEN ABS(amount) ELSE 0 END), 0) AS cout_maintenance,
  COALESCE(SUM(CASE WHEN category = 'admin'       THEN ABS(amount) ELSE 0 END), 0) AS cout_admin,
  COALESCE(SUM(CASE WHEN category = 'projet'      THEN ABS(amount) ELSE 0 END), 0) AS cout_projet,

  COUNT(*) AS transaction_count

FROM transactions
WHERE status != 'cancelled'
GROUP BY
  EXTRACT(YEAR  FROM date),
  EXTRACT(MONTH FROM date),
  TO_CHAR(date, 'YYYY-MM')
ORDER BY year DESC, month DESC;

COMMENT ON VIEW v_compte_courant_monthly IS
  'Compte courant mensuel — classification par type (migration 118), cohérent avec get_financial_summary()';

-- Même correction pour v_compte_courant_yearly
CREATE OR REPLACE VIEW v_compte_courant_yearly AS
SELECT
  year,
  SUM(total_inflow)        AS total_inflow,
  SUM(total_outflow)       AS total_outflow,
  SUM(net_balance)         AS net_balance,
  SUM(cout_operation)      AS cout_operation,
  SUM(cout_maintenance)    AS cout_maintenance,
  SUM(cout_admin)          AS cout_admin,
  SUM(cout_projet)         AS cout_projet,
  SUM(transaction_count)   AS transaction_count
FROM v_compte_courant_monthly
GROUP BY year
ORDER BY year DESC;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 118: v_compte_courant_monthly et yearly corrigées';
  RAISE NOTICE '   Classification par TYPE (pas par signe du montant)';
  RAISE NOTICE '   Cohérent avec get_financial_summary()';
END $$;
