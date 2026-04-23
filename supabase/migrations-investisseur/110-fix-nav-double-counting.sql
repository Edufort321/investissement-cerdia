-- ==========================================
-- MIGRATION 110: CORRIGER DOUBLE COMPTAGE NAV
-- ==========================================
--
-- PROBLÈME:
-- calculate_realistic_nav_v2() avait property_purchases = 0 car elle cherchait
-- type = 'investissement' AND property_id IS NOT NULL (mauvais type).
-- Les vrais paiements sont de type 'achat_propriete'.
--
-- Résultat: cash_balance = 280 000 $ (investissements bruts, dépôts non déduits)
--         + properties_current_value = ~990 000 CAD (valeur totale × appréciation)
--         → double comptage → NAV = 4.6x au lieu de ~1.26x
--
-- MODÈLE CORRECT pour phase CONSTRUCTION (sans évaluation initiale formelle):
--   current_value = dépôts_payés_en_devises_native
--                 + appréciation_sur_PRIX_TOTAL_du_projet_depuis_réservation
--
-- Exemple: projet 178 000 USD, 8%/an, 1 an, dépôt 50 000 USD payé
--   → current_value = 50 000 USD (dépôt) + 178 000 × 8% = 50 000 + 14 240 = 64 240 USD
--   → total 3 projets: dépôts_payés + 655 000 × 8% = dépôts + 52 400 USD appréciation
--
-- Avec cash_balance = investissements − dépôts − autres dépenses:
--   total_assets = cash + properties_current_value
--                = (investi − dépôts) + (dépôts + appréciation)
--                = investi + appréciation
--   NAV/part ≈ 1.0 + appréciation_proportionnelle (≈ 1.26 pour 52 400 USD sur 280 000 CAD investi)
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 110: FIX DOUBLE COMPTAGE NAV';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '  Modèle construction: current_value = dépôts + appréciation(prix_total)';
  RAISE NOTICE '  Résultat attendu: NAV ≈ 1.0 + gain de 52 400 USD sur 655 000 USD';
END $$;

-- ==========================================
-- 1. VUE current_property_values — CORRECTIF
-- ==========================================

DROP VIEW IF EXISTS current_property_values;

CREATE OR REPLACE VIEW current_property_values AS
SELECT
  p.id                                                                AS property_id,
  p.name                                                              AS property_name,
  p.total_cost                                                        AS acquisition_cost,
  COALESCE(p.reservation_date::DATE, p.completion_date::DATE)        AS acquisition_date,

  pv.acquisition_cost                                                 AS initial_acquisition_cost,
  pv.current_market_value                                             AS initial_market_value,
  pv.valuation_date                                                   AS initial_valuation_date,

  -- ── Valeur courante (devise native de la propriété) ──────────────
  --
  -- Cas A: évaluation initiale enregistrée (propriété livrée/acquise)
  --   → valeur de marché avec appréciation (comportement inchangé)
  --
  -- Cas B: pas d'évaluation (construction/réservation)
  --   → dépôts réellement payés + appréciation sur le PRIX TOTAL
  --      (levier: le fonds contrôle 100% de l'appréciation même avant paiement complet)
  CASE
    WHEN pv.acquisition_cost IS NOT NULL THEN
      calculate_property_value_with_appreciation(p.id, CURRENT_DATE)

    ELSE
      -- Dépôts payés en devise native
      COALESCE((
        SELECT SUM(
          CASE
            WHEN p.currency = 'USD' THEN
              CASE
                WHEN t.source_currency = 'USD' AND t.source_amount > 0
                  THEN t.source_amount
                WHEN t.exchange_rate > 0
                  THEN ABS(t.amount) / t.exchange_rate
                ELSE ABS(t.amount) / COALESCE(get_current_exchange_rate('USD', 'CAD'), 1.40)
              END
            ELSE ABS(t.amount)
          END
        )
        FROM transactions t
        WHERE t.property_id = p.id
          AND t.type IN ('achat_propriete', 'paiement')
          AND t.status != 'cancelled'
      ), 0)
      +
      -- Appréciation sur le PRIX TOTAL depuis la date de réservation
      -- (levier: le fonds bénéficie de la totalité de la plus-value)
      CASE
        WHEN COALESCE(p.reservation_date::DATE, p.completion_date::DATE) IS NOT NULL
             AND p.total_cost > 0
             AND (CURRENT_DATE - COALESCE(p.reservation_date::DATE, p.completion_date::DATE))::NUMERIC > 0
        THEN
          GREATEST(
            p.total_cost * (
              POWER(
                1.0 + get_property_appreciation_rate(p.id),
                (CURRENT_DATE - COALESCE(p.reservation_date::DATE, p.completion_date::DATE))::NUMERIC / 365.25
              ) - 1.0
            ),
            0.0
          )
        ELSE 0.0
      END
  END                                                                 AS current_value,

  -- ── Années détenues ──────────────────────────────────────────────
  GREATEST(
    (CURRENT_DATE - COALESCE(
      p.reservation_date::DATE,
      p.completion_date::DATE,
      pv.valuation_date,
      CURRENT_DATE
    ))::NUMERIC / 365.25,
    0
  )                                                                   AS years_held,

  -- ── Appréciation (montant) ────────────────────────────────────────
  CASE
    WHEN pv.acquisition_cost IS NOT NULL THEN
      -- Post-livraison: gain vs coût d'acquisition
      calculate_property_value_with_appreciation(p.id, CURRENT_DATE)
        - COALESCE(pv.acquisition_cost, p.total_cost, 0)
    WHEN COALESCE(p.reservation_date::DATE, p.completion_date::DATE) IS NOT NULL
         AND p.total_cost > 0 THEN
      -- Construction: appréciation sur prix total
      GREATEST(
        p.total_cost * (
          POWER(
            1.0 + get_property_appreciation_rate(p.id),
            (CURRENT_DATE - COALESCE(p.reservation_date::DATE, p.completion_date::DATE))::NUMERIC / 365.25
          ) - 1.0
        ),
        0.0
      )
    ELSE 0
  END                                                                 AS appreciation_amount,

  -- ── Appréciation (%) ─────────────────────────────────────────────
  CASE
    WHEN pv.acquisition_cost IS NOT NULL AND COALESCE(pv.acquisition_cost, p.total_cost, 0) > 0 THEN
      ROUND((
        (calculate_property_value_with_appreciation(p.id, CURRENT_DATE)
          - COALESCE(pv.acquisition_cost, p.total_cost))
        / COALESCE(pv.acquisition_cost, p.total_cost)
      ) * 100, 2)
    WHEN p.total_cost > 0
         AND COALESCE(p.reservation_date::DATE, p.completion_date::DATE) IS NOT NULL THEN
      -- % appréciation sur prix total depuis réservation
      ROUND(
        (POWER(
          1.0 + get_property_appreciation_rate(p.id),
          (CURRENT_DATE - COALESCE(p.reservation_date::DATE, p.completion_date::DATE))::NUMERIC / 365.25
        ) - 1.0) * 100,
        2
      )
    ELSE 0
  END                                                                 AS appreciation_percentage,

  p.status,
  p.currency,
  ROUND(get_property_appreciation_rate(p.id) * 100, 2)              AS appreciation_rate_pct

FROM properties p
LEFT JOIN property_valuations pv
  ON p.id = pv.property_id AND pv.valuation_type = 'initial'
WHERE p.status IN (
  'reservation', 'en_construction', 'acquired', 'complete', 'actif', 'en_location'
)
ORDER BY COALESCE(p.reservation_date::DATE, p.completion_date::DATE) DESC NULLS LAST;

COMMENT ON VIEW current_property_values IS
  'Phase construction (sans évaluation):
    current_value = dépôts_payés(USD) + appréciation(total_cost × taux × années)
    → levier: le fonds bénéficie 100% de la plus-value même avant paiement complet
   Phase post-livraison (évaluation initiale présente):
    current_value = calculate_property_value_with_appreciation() (valeur marché)';

DO $$
BEGIN
  RAISE NOTICE '✅ Vue current_property_values corrigée';
END $$;

-- ==========================================
-- 2. FONCTION calculate_realistic_nav_v2 — CORRECTIF
-- ==========================================

DROP FUNCTION IF EXISTS calculate_realistic_nav_v2(DATE);

CREATE OR REPLACE FUNCTION calculate_realistic_nav_v2(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_investments        DECIMAL(15, 2),
  property_purchases       DECIMAL(15, 2),
  capex_expenses           DECIMAL(15, 2),
  maintenance_expenses     DECIMAL(15, 2),
  admin_expenses           DECIMAL(15, 2),
  rental_income            DECIMAL(15, 2),
  cash_balance             DECIMAL(15, 2),
  properties_initial_value DECIMAL(15, 2),
  properties_current_value DECIMAL(15, 2),
  properties_appreciation  DECIMAL(15, 2),
  total_assets             DECIMAL(15, 2),
  total_liabilities        DECIMAL(15, 2),
  net_asset_value          DECIMAL(15, 2),
  total_shares             DECIMAL(15, 4),
  nav_per_share            DECIMAL(10, 4),
  nav_change_pct           DECIMAL(10, 4)
) AS $$
DECLARE
  v_exchange_rate DECIMAL(10, 4);
BEGIN
  SELECT get_current_exchange_rate('USD', 'CAD') INTO v_exchange_rate;
  IF v_exchange_rate IS NULL OR v_exchange_rate <= 0 THEN
    v_exchange_rate := 1.40;
  END IF;

  -- ── Flux de trésorerie ───────────────────────────────────────────

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO total_investments
  FROM transactions t
  WHERE t.type = 'investissement' AND t.status != 'cancelled';

  -- CORRECTIF: utiliser les vrais types de paiements immobiliers
  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO property_purchases
  FROM transactions t
  WHERE t.type IN ('achat_propriete', 'paiement')
    AND t.property_id IS NOT NULL
    AND t.status != 'cancelled';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO capex_expenses
  FROM transactions t WHERE t.type = 'capex' AND t.status != 'cancelled';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO maintenance_expenses
  FROM transactions t WHERE t.type = 'maintenance' AND t.status != 'cancelled';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO admin_expenses
  FROM transactions t
  WHERE t.type IN ('admin', 'depense', 'remboursement_investisseur') AND t.status != 'cancelled';

  SELECT COALESCE(SUM(ABS(t.amount)), 0) INTO rental_income
  FROM transactions t WHERE t.type = 'loyer' AND t.status != 'cancelled';

  -- Trésorerie = entrées − tous les débours + revenus
  cash_balance := total_investments
                  - property_purchases
                  - capex_expenses
                  - maintenance_expenses
                  - admin_expenses
                  + rental_income;

  -- ── Valeur initiale des propriétés (en CAD) ──────────────────────

  -- Propriétés avec évaluation formelle
  SELECT COALESCE(SUM(
    CASE WHEN pv.currency = 'USD' THEN pv.acquisition_cost * v_exchange_rate
         ELSE pv.acquisition_cost END
  ), 0)
  INTO properties_initial_value
  FROM property_valuations pv WHERE pv.valuation_type = 'initial';

  -- Propriétés en construction: base = dépôts payés (en CAD)
  properties_initial_value := properties_initial_value + COALESCE((
    SELECT SUM(ABS(t.amount))
    FROM transactions t
    WHERE t.type IN ('achat_propriete', 'paiement')
      AND t.property_id IS NOT NULL
      AND t.status != 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM property_valuations pv2
        WHERE pv2.property_id = t.property_id AND pv2.valuation_type = 'initial'
      )
  ), 0);

  -- ── Valeur actuelle avec appréciation (en CAD) ───────────────────
  -- Lue depuis current_property_values (corrigée ci-dessus)
  -- Construction: dépôts + appréciation sur prix total
  -- Post-livraison: valeur de marché avec appréciation
  SELECT COALESCE(SUM(
    CASE WHEN cpv.currency = 'USD' THEN cpv.current_value * v_exchange_rate
         ELSE cpv.current_value END
  ), 0)
  INTO properties_current_value
  FROM current_property_values cpv;

  -- ── NAV ──────────────────────────────────────────────────────────
  properties_appreciation := properties_current_value - properties_initial_value;
  total_assets             := cash_balance + properties_current_value;
  total_liabilities        := 0;
  net_asset_value          := total_assets - total_liabilities;

  SELECT COALESCE(SUM(number_of_shares), 0) INTO total_shares
  FROM investor_investments;

  IF total_shares > 0 THEN
    nav_per_share := net_asset_value / total_shares;
  ELSE
    nav_per_share := 1.0000;
  END IF;

  nav_change_pct := ((nav_per_share - 1.00) / 1.00) * 100;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_realistic_nav_v2 IS
  'NAV sans double comptage.
   Modèle construction (sans évaluation):
     cash = investissements - dépôts_payés - autres
     propriétés = dépôts_payés + appréciation(prix_total)
     → total_assets = investissements - autres + appréciation
     → NAV ≈ 1.0 + gain_appréciation_proportionnel
   Exemple: 655 000 USD × 8%/an = 52 400 USD gain → NAV ≈ 1.26 pour 280 000 CAD investi';

DO $$
BEGIN
  RAISE NOTICE '✅ calculate_realistic_nav_v2() corrigée (no double counting)';
END $$;

-- ==========================================
-- VÉRIFICATION
-- ==========================================
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VÉRIFICATION MIGRATION 110';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  FOR v_result IN SELECT * FROM calculate_realistic_nav_v2() LOOP
    RAISE NOTICE '  total_investments    : % CAD', v_result.total_investments;
    RAISE NOTICE '  property_purchases   : % CAD', v_result.property_purchases;
    RAISE NOTICE '  cash_balance         : % CAD', v_result.cash_balance;
    RAISE NOTICE '  properties_initial   : % CAD', v_result.properties_initial_value;
    RAISE NOTICE '  properties_current   : % CAD', v_result.properties_current_value;
    RAISE NOTICE '  properties_appreci.  : % CAD', v_result.properties_appreciation;
    RAISE NOTICE '  net_asset_value      : % CAD', v_result.net_asset_value;
    RAISE NOTICE '  total_shares         : %', v_result.total_shares;
    RAISE NOTICE '  nav_per_share        : % $', v_result.nav_per_share;
    RAISE NOTICE '  nav_change_pct       : %%%', v_result.nav_change_pct;
  END LOOP;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '💡 Pour 3 projets (178k+250k+227k USD, 8%/an, ~1 an):';
  RAISE NOTICE '   Appréciation attendue: ~52 400 USD = ~73 000 CAD';
  RAISE NOTICE '   nav_per_share attendu: ~1.20-1.30 (selon dates réservation)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 110 TERMINÉE — NAV sans double comptage, appréciation sur prix total' AS status;
