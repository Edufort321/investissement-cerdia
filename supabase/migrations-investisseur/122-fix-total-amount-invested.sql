-- Migration 122: Corriger total_amount_invested = total_shares en valeur
--
-- PROBLÈME : investor_summary calcule total_amount_invested en filtrant
--   uniquement les types 'investissement' et 'paiement+achat_parts'.
--   Tout autre type qui génère des parts (achat_propriete, etc.) est ignoré,
--   causant total_amount_invested < total_shares → ROI artificiellement gonflé.
--
-- SOLUTION : Lire total_amount_invested directement depuis investor_investments
--   (amount_invested déjà synchronisé avec transactions par migration 114).
--   Ainsi total_amount_invested = SUM(parts × prix_par_part) = valeur réelle investie.

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 122: FIX total_amount_invested';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ─── Vue corrigée ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.investor_summary AS
SELECT
  i.id                                                            AS investor_id,
  CONCAT(i.first_name, ' ', i.last_name)                         AS investor_name,
  i.email,
  COUNT(ii.id)                                                    AS total_investments,

  -- Montant total investi = SUM depuis investor_investments (toutes sources de parts)
  -- amount_invested est synchronisé avec ABS(transactions.amount) par migration 114
  COALESCE(SUM(ii.amount_invested), 0)                           AS total_amount_invested,

  -- Parts totales
  COALESCE(SUM(ii.number_of_shares), 0)                          AS total_shares,

  COALESCE(AVG(ii.share_price_at_purchase), 0)                   AS average_purchase_price,
  MIN(ii.investment_date)                                        AS first_investment_date,
  MAX(ii.investment_date)                                        AS last_investment_date
FROM public.investors i
LEFT JOIN public.investor_investments ii ON i.id = ii.investor_id
GROUP BY i.id, i.first_name, i.last_name, i.email;

COMMENT ON VIEW public.investor_summary IS
  'Résumé par investisseur — total_amount_invested et total_shares depuis investor_investments (toutes sources confondues)';

-- ─── Vérification ────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé par investisseur après correction :';
  FOR r IN
    SELECT investor_name, total_amount_invested, total_shares,
           ROUND(total_amount_invested - total_shares, 2) AS ecart
    FROM investor_summary
    ORDER BY investor_name
  LOOP
    RAISE NOTICE '  % → % $ investi, % parts (écart: %)',
      r.investor_name, r.total_amount_invested, r.total_shares, r.ecart;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 122 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 122 — total_amount_invested aligné sur investor_investments' AS status;
