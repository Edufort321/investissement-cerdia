-- Migration 114: Corriger total_invested — aligner avec les transactions réelles
--
-- PROBLÈME : investor_investments.amount_invested pour les enregistrements
--            backfillés (paiement+achat_parts) peut différer du montant réel
--            de la transaction, causant total_amount_invested ≠ total_shares.
--
-- SOLUTION :
--   1. Recorriger amount_invested pour TOUS les enregistrements liés à une
--      transaction (transaction_id IS NOT NULL) → ABS(transactions.amount)
--   2. Re-synchroniser investors.total_invested depuis investor_investments
--   3. Mettre à jour investor_summary pour calculer total_amount_invested
--      directement depuis les transactions (source de vérité)

-- ─── 1. Recorriger amount_invested dans investor_investments ─────────────────

UPDATE investor_investments ii
SET
  amount_invested = ABS(t.amount),
  updated_at      = NOW()
FROM transactions t
WHERE ii.transaction_id = t.id
  AND ABS(ii.amount_invested - ABS(t.amount)) > 0.01; -- corriger seulement si différent

-- ─── 2. Recalculer investors.total_invested pour tous les investisseurs ──────

DO $$
DECLARE
  v_investor RECORD;
  v_total_shares   DECIMAL(15,4);
  v_total_invested DECIMAL(15,2);
BEGIN
  FOR v_investor IN SELECT id FROM investors LOOP
    SELECT
      COALESCE(SUM(number_of_shares), 0),
      COALESCE(SUM(amount_invested),  0)
    INTO v_total_shares, v_total_invested
    FROM investor_investments
    WHERE investor_id = v_investor.id;

    UPDATE investors
    SET
      total_shares   = v_total_shares,
      total_invested = v_total_invested,
      updated_at     = NOW()
    WHERE id = v_investor.id;
  END LOOP;
END $$;

-- ─── 3. Mettre à jour investor_summary — source de vérité = transactions ────
--
-- total_amount_invested = SUM des montants réels investis par cet investisseur
-- (type='investissement' OU paiement+achat_parts), status != 'cancelled'

CREATE OR REPLACE VIEW public.investor_summary AS
SELECT
  i.id                                                            AS investor_id,
  CONCAT(i.first_name, ' ', i.last_name)                         AS investor_name,
  i.email,
  COUNT(ii.id)                                                    AS total_investments,

  -- Montant total investi = SUM direct depuis transactions (source de vérité)
  COALESCE((
    SELECT SUM(ABS(t.amount))
    FROM transactions t
    WHERE t.investor_id = i.id
      AND (
        t.type = 'investissement'
        OR (t.type = 'paiement' AND t.investor_payment_type = 'achat_parts')
      )
      AND t.status != 'cancelled'
  ), 0)                                                           AS total_amount_invested,

  -- Parts depuis investor_investments (géré par les triggers)
  COALESCE(SUM(ii.number_of_shares), 0)                          AS total_shares,

  COALESCE(AVG(ii.share_price_at_purchase), 0)                   AS average_purchase_price,
  MIN(ii.investment_date)                                        AS first_investment_date,
  MAX(ii.investment_date)                                        AS last_investment_date
FROM public.investors i
LEFT JOIN public.investor_investments ii ON i.id = ii.investor_id
GROUP BY i.id, i.first_name, i.last_name, i.email;

COMMENT ON VIEW public.investor_summary IS
  'Résumé par investisseur — total_amount_invested depuis transactions, total_shares depuis investor_investments';

-- ─── Diagnostic final ────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 114 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé par investisseur :';
  FOR r IN
    SELECT investor_name, total_amount_invested, total_shares
    FROM investor_summary
    ORDER BY investor_name
  LOOP
    RAISE NOTICE '  % → %$ investi, % parts',
      r.investor_name, r.total_amount_invested, r.total_shares;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
