-- Migration 216 : Les triggers de parts propagent organization_id (fix post-208)
-- =====================================================================
-- BUG : impossible d'enregistrer une transaction d'investissement.
--   POST transactions → 403, et « new row violates RLS tenant_isolation
--   for table investor_investments ».
--
-- CAUSE : les triggers auto_create/update_investor_shares (mig.113) insèrent
--   dans investor_investments SANS renseigner organization_id. Avant la
--   mig.208 la colonne avait un DEFAULT = CERDIA Globale qui « sauvait » ces
--   inserts (au prix d'une contamination silencieuse). La mig.208 a retiré ce
--   DEFAULT (correct, anti-contamination) → la ligne créée par le trigger a
--   désormais organization_id = NULL → la policy tenant_isolation (mig.211)
--   refuse (NULL ne matche ni auth_get_org_id() ni super_admin_can_access(NULL))
--   → l'INSERT de la transaction parente échoue en entier.
--
-- CORRECTIF : redéfinir les 2 fonctions trigger pour propager
--   organization_id = NEW.organization_id (l'org de la transaction parente).
--   La colonne transactions.organization_id est NOT NULL (mig.208) → NEW.org
--   est toujours présent. CREATE OR REPLACE : ne touche ni aux triggers ni aux
--   données ; aucun doublon de trigger (vérifié : 0 double-compte en base).
-- =====================================================================

-- ─── Trigger INSERT (mig.113 + organization_id) ──────────────────────────────
CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price      DECIMAL(10,4);
  v_number_of_shares DECIMAL(15,4);
BEGIN
  IF NOT tx_should_generate_shares(NEW.type, NEW.investor_payment_type, NEW.investor_id) THEN
    RETURN NEW;
  END IF;

  -- Vérifier qu'il n'existe pas déjà (idempotent)
  IF EXISTS (SELECT 1 FROM investor_investments WHERE transaction_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
  IF v_share_price IS NULL OR v_share_price <= 0 THEN v_share_price := 1.00; END IF;

  v_number_of_shares := ABS(NEW.amount) / v_share_price;

  INSERT INTO investor_investments (
    organization_id, investor_id, transaction_id, investment_date, amount_invested,
    number_of_shares, share_price_at_purchase, currency,
    payment_method, status, notes
  ) VALUES (
    NEW.organization_id, NEW.investor_id, NEW.id, NEW.date, ABS(NEW.amount),
    v_number_of_shares, v_share_price,
    COALESCE(NEW.source_currency, 'CAD'),
    COALESCE(NEW.payment_method, 'virement'), 'active',
    CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
  );

  RAISE NOTICE '✅ Parts créées (INSERT): % parts pour investisseur % (tx_type: %)',
    v_number_of_shares, NEW.investor_id, NEW.type;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Trigger UPDATE (mig.113 + organization_id sur la branche INSERT) ─────────
CREATE OR REPLACE FUNCTION auto_update_investor_shares_on_transaction_update()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price      DECIMAL(10,4);
  v_number_of_shares DECIMAL(15,4);
  v_existing_id      UUID;
BEGIN
  -- Si la transaction ne doit plus générer de parts → supprimer
  IF NOT tx_should_generate_shares(NEW.type, NEW.investor_payment_type, NEW.investor_id) THEN
    IF tx_should_generate_shares(OLD.type, OLD.investor_payment_type, OLD.investor_id) THEN
      DELETE FROM investor_investments WHERE transaction_id = OLD.id;
      RAISE NOTICE '🗑️ Parts supprimées (plus eligible)';
    END IF;
    RETURN NEW;
  END IF;

  SELECT nominal_share_value INTO v_share_price FROM share_settings LIMIT 1;
  IF v_share_price IS NULL OR v_share_price <= 0 THEN v_share_price := 1.00; END IF;

  v_number_of_shares := ABS(NEW.amount) / v_share_price;

  SELECT id INTO v_existing_id FROM investor_investments WHERE transaction_id = NEW.id;

  IF v_existing_id IS NOT NULL THEN
    UPDATE investor_investments SET
      organization_id        = NEW.organization_id,
      investor_id            = NEW.investor_id,
      investment_date        = NEW.date,
      amount_invested        = ABS(NEW.amount),
      number_of_shares       = v_number_of_shares,
      share_price_at_purchase = v_share_price,
      currency               = COALESCE(NEW.source_currency, 'CAD'),
      updated_at             = NOW()
    WHERE id = v_existing_id;

    RAISE NOTICE '✅ Parts mises à jour (UPDATE): %', v_number_of_shares;
  ELSE
    INSERT INTO investor_investments (
      organization_id, investor_id, transaction_id, investment_date, amount_invested,
      number_of_shares, share_price_at_purchase, currency,
      payment_method, status, notes
    ) VALUES (
      NEW.organization_id, NEW.investor_id, NEW.id, NEW.date, ABS(NEW.amount),
      v_number_of_shares, v_share_price,
      COALESCE(NEW.source_currency, 'CAD'),
      COALESCE(NEW.payment_method, 'virement'), 'active',
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
    );

    RAISE NOTICE '✅ Parts créées (UPDATE→INSERT): % parts', v_number_of_shares;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Vérification ────────────────────────────────────────────────────────────
-- Doit lister les 2 fonctions contenant désormais « organization_id ».
SELECT proname
FROM pg_proc
WHERE proname IN (
  'auto_create_investor_shares_from_transaction',
  'auto_update_investor_shares_on_transaction_update'
)
  AND prosrc LIKE '%organization_id%';
