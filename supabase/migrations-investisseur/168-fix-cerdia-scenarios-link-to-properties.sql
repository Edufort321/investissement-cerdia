-- ============================================================
-- Migration 168 : Relie les scénarios CERDIA Globale aux vraies propriétés
--
-- Situation : 5 scénarios incorrects (status=draft, sans lien property)
-- existent dans CERDIA Globale suite à des copies DEMO + suppressions.
-- Les 3 vraies propriétés et leurs 15 payment_schedules sont intacts.
-- Cette migration supprime les mauvais scénarios et en crée 3 corrects
-- (status=purchased, liés aux propriétés réelles).
-- ============================================================

DO $$
DECLARE
  v_cerdia uuid := 'c0000000-0000-0000-0000-000000000001';

  -- IDs des vraies propriétés CERDIA Globale
  v_prop_a302 uuid := '48785cab-beb3-4844-bc67-a146d75dca5c'; -- Oasis Bay - A302
  v_prop_a301 uuid := '92fa2d93-7c49-4c0c-9e1e-8b5e6ced3606'; -- Oasis Bay - A301
  v_prop_sg   uuid := '16eddafb-47dd-4919-8f30-0444958fc7d1'; -- Secret Garden - H212

  v_now timestamptz := now();

  v_id_a302 uuid;
  v_id_a301 uuid;
  v_id_sg   uuid;
BEGIN

  -- 1. Supprimer tous les scénarios incorrects de CERDIA Globale
  DELETE FROM scenarios WHERE organization_id = v_cerdia;

  -- 2. Oasis Bay - A302 (total_cost = 178 000 USD)
  --    Échéancier réel (depuis payment_schedules) :
  --    Pmt 1 : 20 avr 2025  33 600 USD  (overdue)
  --    Pmt 2 : 20 oct 2025  17 800 USD  (overdue)
  --    Pmt 3 : 20 avr 2026  17 800 USD  (pending)
  --    Pmt 4 : 20 oct 2026  17 800 USD  (pending)
  --    Pmt 5 :  1 mar 2027  89 000 USD  (pending)
  INSERT INTO scenarios (
    id, organization_id, name, purchase_price, initial_fees,
    payment_type, purchase_currency, status,
    converted_property_id, converted_at,
    payment_terms, promoter_data, transaction_fees, recurring_fees,
    construction_status, exchange_rate_at_creation,
    deduct_initial_from_first_term, purchase_type, mortgage_rate_type
  ) VALUES (
    gen_random_uuid(), v_cerdia, 'Oasis Bay - A302', 178000, 0,
    'cash', 'USD', 'purchased',
    v_prop_a302, v_now,
    '[
      {"label":"Paiement °1","due_date":"2025-04-20","percentage":20,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °2","due_date":"2025-10-20","percentage":10,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °3","due_date":"2026-04-20","percentage":10,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °4","due_date":"2026-10-20","percentage":10,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °5","due_date":"2027-03-01","percentage":50,"amount_type":"percentage","fixed_amount":0}
    ]'::jsonb,
    '{"tax_rate":27,"rent_type":"nightly","monthly_rent":0,"rent_currency":"USD","occupancy_rate":65,"management_fees":35,"project_duration":10,"annual_appreciation":8,"annual_rent_increase":2}'::jsonb,
    '{"type":"percentage","currency":"USD","percentage":0,"fixed_amount":0}'::jsonb,
    '[]'::jsonb,
    'in_progress', 1.35, false, 'cash', 'fixed'
  ) RETURNING id INTO v_id_a302;

  -- Lier la propriété à ce scénario
  UPDATE properties SET origin_scenario_id = v_id_a302 WHERE id = v_prop_a302;

  -- 3. Oasis Bay - A301 (total_cost = 250 650 USD)
  --    Pmt 1 :  5 mai 2025  48 100 USD  (overdue)
  --    Pmt 2 : 30 nov 2025  25 065 USD  (paid)
  --    Pmt 3 : 30 mai 2026  25 065 USD  (pending)
  --    Pmt 4 : 30 nov 2027  25 065 USD  (pending)
  --    Pmt 5 :  1 mar 2027 125 325 USD  (pending)
  INSERT INTO scenarios (
    id, organization_id, name, purchase_price, initial_fees,
    payment_type, purchase_currency, status,
    converted_property_id, converted_at,
    payment_terms, promoter_data, transaction_fees, recurring_fees,
    construction_status, exchange_rate_at_creation,
    deduct_initial_from_first_term, purchase_type, mortgage_rate_type
  ) VALUES (
    gen_random_uuid(), v_cerdia, 'Oasis Bay - A301', 250650, 0,
    'cash', 'USD', 'purchased',
    v_prop_a301, v_now,
    '[
      {"label":"Paiement °1","due_date":"2025-05-05","percentage":20,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °2","due_date":"2025-11-30","percentage":10,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °3","due_date":"2026-05-30","percentage":10,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °4","due_date":"2027-11-30","percentage":10,"amount_type":"percentage","fixed_amount":0},
      {"label":"Paiement °5","due_date":"2027-03-01","percentage":50,"amount_type":"percentage","fixed_amount":0}
    ]'::jsonb,
    '{"tax_rate":27,"rent_type":"nightly","monthly_rent":0,"rent_currency":"USD","occupancy_rate":65,"management_fees":35,"project_duration":10,"annual_appreciation":8,"annual_rent_increase":2}'::jsonb,
    '{"type":"percentage","currency":"USD","percentage":0,"fixed_amount":0}'::jsonb,
    '[]'::jsonb,
    'in_progress', 1.35, false, 'cash', 'fixed'
  ) RETURNING id INTO v_id_a301;

  UPDATE properties SET origin_scenario_id = v_id_a301 WHERE id = v_prop_a301;

  -- 4. Secret Garden - H212 (total_cost = 224 534 USD)
  --    Pmt 1 : 15 sep 2025  129 720.40 USD  (paid)
  --    Pmt 2 : 30 oct 2025   14 968.93 USD  (pending)
  --    Pmt 3 : 30 nov 2025   14 968.93 USD  (paid)
  --    Pmt 4 : 30 jan 2026   14 968.94 USD  (paid)
  --    Pmt 5 :  1 déc 2026   44 907.20 USD  (pending)
  INSERT INTO scenarios (
    id, organization_id, name, purchase_price, initial_fees,
    payment_type, purchase_currency, status,
    converted_property_id, converted_at,
    payment_terms, promoter_data, transaction_fees, recurring_fees,
    construction_status, exchange_rate_at_creation,
    deduct_initial_from_first_term, purchase_type, mortgage_rate_type
  ) VALUES (
    gen_random_uuid(), v_cerdia, 'Secret Garden - H212', 224534, 4709,
    'cash', 'USD', 'purchased',
    v_prop_sg, v_now,
    '[
      {"label":"Paiement °1","due_date":"2025-09-15","percentage":0,"amount_type":"fixed_amount","fixed_amount":129720.40},
      {"label":"Paiement °2","due_date":"2025-10-30","percentage":0,"amount_type":"fixed_amount","fixed_amount":14968.93},
      {"label":"Paiement °3","due_date":"2025-11-30","percentage":0,"amount_type":"fixed_amount","fixed_amount":14968.93},
      {"label":"Paiement °4","due_date":"2026-01-30","percentage":0,"amount_type":"fixed_amount","fixed_amount":14968.94},
      {"label":"Paiement °5","due_date":"2026-12-01","percentage":0,"amount_type":"fixed_amount","fixed_amount":44907.20}
    ]'::jsonb,
    '{"tax_rate":27,"rent_type":"nightly","monthly_rent":0,"rent_currency":"USD","occupancy_rate":65,"management_fees":35,"project_duration":10,"annual_appreciation":8,"annual_rent_increase":2}'::jsonb,
    '{"type":"percentage","currency":"USD","percentage":0,"fixed_amount":0}'::jsonb,
    '[]'::jsonb,
    'in_progress', 1.35, false, 'cash', 'fixed'
  ) RETURNING id INTO v_id_sg;

  UPDATE properties SET origin_scenario_id = v_id_sg WHERE id = v_prop_sg;

  RAISE NOTICE 'Migration 168 OK : 3 scénarios CERDIA recréés et liés à leurs propriétés.';
  RAISE NOTICE '  Oasis Bay - A302  → scénario %', v_id_a302;
  RAISE NOTICE '  Oasis Bay - A301  → scénario %', v_id_a301;
  RAISE NOTICE '  Secret Garden H212 → scénario %', v_id_sg;
END $$;
