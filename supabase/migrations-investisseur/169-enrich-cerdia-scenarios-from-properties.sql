-- ============================================================
-- Migration 169 : Copie les données financières réelles des scénarios
--                 DEMO vers les scénarios CERDIA Globale.
--
-- Les scénarios DEMO sont des clones des scénarios CERDIA originaux.
-- Correspondance par ordre de création (confirmée) :
--   DEMO Projet Démo 1  (420ca680) → CERDIA Oasis Bay - A302  (2280e3cf)
--   DEMO Projet Démo 2  (2602fcd6) → CERDIA Oasis Bay - A301  (e3fc0e3e)
--   DEMO Secret Garden  (43951756) → CERDIA Secret Garden H212 (f9412c9e)
--
-- Copie : purchase_price, initial_fees, promoter_data, payment_terms,
--         exchange_rate, photos, et champs financiers.
-- Exclut : promoter_name/broker_name (valeurs "Démo" fictives).
-- Conserve : name, organization_id, converted_property_id, status.
-- ============================================================

DO $$
DECLARE
  v_cerdia uuid := 'c0000000-0000-0000-0000-000000000001';

  -- Correspondance DEMO id → CERDIA id (par ordre de création)
  v_demo_a302  uuid := '420ca680-a2ae-4ce6-afbe-b833f66ab323'; -- Projet Démo 1
  v_demo_a301  uuid := '2602fcd6-d736-48dc-9d0b-76af4558c051'; -- Projet Démo 2
  v_demo_sg    uuid := '43951756-a9bf-49d3-830d-5b521880c3bb'; -- Secret Garden

  v_cerdia_a302 uuid := '2280e3cf-d780-4e2c-a324-d8ebe45d113a'; -- Oasis Bay - A302
  v_cerdia_a301 uuid := 'e3fc0e3e-cfaa-42bd-ad58-002c24353399'; -- Oasis Bay - A301
  v_cerdia_sg   uuid := 'f9412c9e-51d9-470b-b961-64f7428b2a43'; -- Secret Garden - H212

  -- Photos (depuis properties — DEMO Secret Garden avait photo vide)
  v_photo_a302 text := 'https://svwolnvknfmakgmjhoml.supabase.co/storage/v1/object/public/scenario-documents/ba071f67-30b3-4c8c-be4e-32b40ca8c245/main-photo-1778787677313.png';
  v_photo_a301 text := 'https://svwolnvknfmakgmjhoml.supabase.co/storage/v1/object/public/scenario-documents/b06323b4-7670-4d9d-a3ed-0bd6f1ea2b1c/main-photo-1778787629399.png';
  v_photo_sg   text := 'https://svwolnvknfmakgmjhoml.supabase.co/storage/v1/object/public/scenario-documents/418c28e6-4dd8-4ee0-81a4-3e2a37baa14e/main-photo-1778787566954.jpg';
BEGIN

  -- ── Oasis Bay - A302 ─────────────────────────────────────────────────
  UPDATE scenarios AS c
  SET
    purchase_price              = d.purchase_price,
    initial_fees                = d.initial_fees,
    promoter_data               = d.promoter_data,
    payment_terms               = d.payment_terms,
    payment_type                = d.payment_type,
    purchase_currency           = d.purchase_currency,
    exchange_rate_at_creation   = d.exchange_rate_at_creation,
    initial_fees_distribution   = d.initial_fees_distribution,
    deduct_initial_from_first_term = d.deduct_initial_from_first_term,
    recurring_fees              = d.recurring_fees,
    transaction_fees            = d.transaction_fees,
    construction_status         = d.construction_status,
    owner_occupation_days       = d.owner_occupation_days,
    purchase_type               = d.purchase_type,
    mortgage_rate_type          = d.mortgage_rate_type,
    unit_number                 = 'A302',
    address                     = 'Cana Bay, Higüey',
    country                     = 'DO',
    state_region                = 'République Dominicaine',
    delivery_date               = '2027-03-01',
    main_photo_url              = v_photo_a302
  FROM scenarios AS d
  WHERE d.id = v_demo_a302
    AND c.id = v_cerdia_a302;

  -- ── Oasis Bay - A301 ─────────────────────────────────────────────────
  UPDATE scenarios AS c
  SET
    purchase_price              = d.purchase_price,
    initial_fees                = d.initial_fees,
    promoter_data               = d.promoter_data,
    payment_terms               = d.payment_terms,
    payment_type                = d.payment_type,
    purchase_currency           = d.purchase_currency,
    exchange_rate_at_creation   = d.exchange_rate_at_creation,
    initial_fees_distribution   = d.initial_fees_distribution,
    deduct_initial_from_first_term = d.deduct_initial_from_first_term,
    recurring_fees              = d.recurring_fees,
    transaction_fees            = d.transaction_fees,
    construction_status         = d.construction_status,
    owner_occupation_days       = d.owner_occupation_days,
    purchase_type               = d.purchase_type,
    mortgage_rate_type          = d.mortgage_rate_type,
    unit_number                 = 'A301',
    address                     = 'Cana Bay, Higüey',
    country                     = 'DO',
    state_region                = 'République Dominicaine',
    delivery_date               = '2027-03-01',
    main_photo_url              = v_photo_a301
  FROM scenarios AS d
  WHERE d.id = v_demo_a301
    AND c.id = v_cerdia_a301;

  -- ── Secret Garden - H212 ─────────────────────────────────────────────
  UPDATE scenarios AS c
  SET
    purchase_price              = d.purchase_price,
    initial_fees                = d.initial_fees,
    promoter_data               = d.promoter_data,
    payment_terms               = d.payment_terms,
    payment_type                = d.payment_type,
    purchase_currency           = d.purchase_currency,
    exchange_rate_at_creation   = d.exchange_rate_at_creation,
    initial_fees_distribution   = d.initial_fees_distribution,
    deduct_initial_from_first_term = d.deduct_initial_from_first_term,
    recurring_fees              = d.recurring_fees,
    transaction_fees            = d.transaction_fees,
    construction_status         = d.construction_status,
    owner_occupation_days       = d.owner_occupation_days,
    purchase_type               = d.purchase_type,
    mortgage_rate_type          = d.mortgage_rate_type,
    unit_number                 = 'H212',
    address                     = 'Los Corales, Bávaro',
    country                     = 'DO',
    state_region                = 'République Dominicaine',
    delivery_date               = '2026-09-15',
    main_photo_url              = v_photo_sg
  FROM scenarios AS d
  WHERE d.id = v_demo_sg
    AND c.id = v_cerdia_sg;

  RAISE NOTICE 'Migration 169 OK : données financières DEMO copiées vers scénarios CERDIA.';
END $$;
