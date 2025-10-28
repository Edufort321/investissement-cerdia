-- ==========================================
-- MIGRATION 77: CRÉATION AUTOMATIQUE DES PARTS D'INVESTISSEUR
-- Trigger pour synchroniser transactions → investor_investments
-- ==========================================

-- Problème actuel:
-- Quand on crée une transaction de type 'investissement', les parts ne sont pas calculées
-- La table investor_investments reste vide donc total_shares = 0

-- Solution:
-- Créer un trigger qui insère automatiquement dans investor_investments
-- quand une transaction d'investissement est créée

CREATE OR REPLACE FUNCTION auto_create_investor_shares_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_share_price DECIMAL(10, 4);
  v_number_of_shares DECIMAL(15, 4);
BEGIN
  -- Seulement pour les transactions de type 'investissement' avec un investor_id
  IF NEW.type = 'investissement' AND NEW.investor_id IS NOT NULL THEN

    -- Récupérer le prix actuel de la part
    SELECT nominal_share_value INTO v_share_price
    FROM share_settings
    LIMIT 1;

    -- Valeur par défaut si pas de settings
    IF v_share_price IS NULL OR v_share_price = 0 THEN
      v_share_price := 1.00;
    END IF;

    -- Calculer le nombre de parts
    v_number_of_shares := NEW.amount / v_share_price;

    -- Insérer dans investor_investments
    INSERT INTO investor_investments (
      investor_id,
      investment_date,
      amount_invested,
      share_price_at_purchase,
      number_of_shares,
      currency,
      payment_method,
      reference_number,
      notes
    ) VALUES (
      NEW.investor_id,
      NEW.date,
      NEW.amount,
      v_share_price,
      v_number_of_shares,
      COALESCE(NEW.source_currency, 'CAD'),
      NEW.payment_method,
      NEW.reference_number,
      CONCAT('Transaction #', NEW.id, ' - ', NEW.description)
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Parts créées: % parts pour investisseur % (montant: % CAD, prix part: %)',
      v_number_of_shares, NEW.investor_id, NEW.amount, v_share_price;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_investor_shares_from_transaction IS
  'Crée automatiquement un enregistrement dans investor_investments avec calcul des parts quand une transaction d''investissement est créée';

-- Créer le trigger
DROP TRIGGER IF EXISTS auto_create_investor_shares ON transactions;

CREATE TRIGGER auto_create_investor_shares
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_investor_shares_from_transaction();

COMMENT ON TRIGGER auto_create_investor_shares ON transactions IS
  'Synchronise automatiquement les transactions d''investissement avec la table investor_investments';

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'auto_create_investor_shares'
  ) THEN
    RAISE NOTICE '✅ Trigger auto_create_investor_shares créé avec succès';
    RAISE NOTICE 'ℹ️ Les nouvelles transactions d''investissement créeront automatiquement des parts';
    RAISE NOTICE 'ℹ️ Nombre de parts = montant investi / prix nominal de la part';
  ELSE
    RAISE WARNING '⚠️ Échec de création du trigger';
  END IF;
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 77 TERMINÉE' as status,
  'Trigger auto_create_investor_shares créé - Les parts seront calculées automatiquement' as message;
