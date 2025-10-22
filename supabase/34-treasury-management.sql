-- =====================================================
-- SCRIPT 34: GESTION DE TRÉSORERIE AVANCÉE
-- =====================================================
-- Description: Module complet de gestion de trésorerie
--              - Prévisions cash flow
--              - Rapprochement bancaire
--              - Gestion obligations de paiement
--              - Alertes liquidité
-- Dépendances: Script 2 (tables de base)
-- =====================================================

-- =====================================================
-- TABLE 1: COMPTES BANCAIRES
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT NOT NULL,
  currency TEXT DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD', 'DOP', 'EUR')),
  account_type TEXT DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'money_market', 'investment')),
  current_balance DECIMAL(12,2) DEFAULT 0,
  available_balance DECIMAL(12,2) DEFAULT 0,
  last_reconciliation_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_currency ON bank_accounts(currency);

COMMENT ON TABLE bank_accounts IS 'Comptes bancaires de l''entreprise';
COMMENT ON COLUMN bank_accounts.current_balance IS 'Solde actuel du compte';
COMMENT ON COLUMN bank_accounts.available_balance IS 'Solde disponible après obligations';

-- =====================================================
-- TABLE 2: TRANSACTIONS BANCAIRES (Import)
-- =====================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  posted_date DATE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  category TEXT, -- 'salary', 'rent', 'utilities', 'vendor_payment', 'loan', etc.
  reference_number TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_date DATE,
  matched_transaction_id UUID REFERENCES transactions(id),
  notes TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(is_reconciled) WHERE is_reconciled = false;

COMMENT ON TABLE bank_transactions IS 'Transactions bancaires importées';
COMMENT ON COLUMN bank_transactions.is_reconciled IS 'Si la transaction a été rapprochée avec le système';
COMMENT ON COLUMN bank_transactions.matched_transaction_id IS 'ID de la transaction correspondante dans transactions';

-- =====================================================
-- TABLE 3: PRÉVISIONS DE TRÉSORERIE
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_flow_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('operating', 'investing', 'financing')),
  subcategory TEXT, -- 'rental_income', 'property_sale', 'loan_payment', etc.
  flow_type TEXT NOT NULL CHECK (flow_type IN ('inflow', 'outflow')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  scenario_id UUID REFERENCES scenarios(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  description TEXT,
  confidence_level INTEGER DEFAULT 3 CHECK (confidence_level BETWEEN 1 AND 5), -- 1=certain, 5=incertain
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
  is_actual BOOLEAN DEFAULT false, -- true si réalisé, false si prévision
  actual_transaction_id UUID REFERENCES transactions(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_forecast_date ON cash_flow_forecast(forecast_date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecast_category ON cash_flow_forecast(category, flow_type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_forecast_scenario ON cash_flow_forecast(scenario_id) WHERE scenario_id IS NOT NULL;

COMMENT ON TABLE cash_flow_forecast IS 'Prévisions de flux de trésorerie';
COMMENT ON COLUMN cash_flow_forecast.confidence_level IS '1=Certain (contrat signé), 2=Très probable, 3=Probable, 4=Possible, 5=Incertain';

-- =====================================================
-- TABLE 4: OBLIGATIONS DE PAIEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_type TEXT NOT NULL CHECK (obligation_type IN ('accounts_payable', 'loan_payment', 'tax_payment', 'payroll', 'insurance', 'utilities', 'other')),
  vendor_name TEXT,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'partial')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=Critical, 5=Low
  scenario_id UUID REFERENCES scenarios(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  paid_date DATE,
  paid_amount DECIMAL(12,2),
  paid_transaction_id UUID REFERENCES transactions(id),
  late_fee DECIMAL(12,2) DEFAULT 0,
  discount_available DECIMAL(12,2) DEFAULT 0,
  discount_deadline DATE,
  invoice_number TEXT,
  purchase_order_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_obligations_due_date ON payment_obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_obligations_status ON payment_obligations(status);
CREATE INDEX IF NOT EXISTS idx_payment_obligations_vendor ON payment_obligations(vendor_name);
CREATE INDEX IF NOT EXISTS idx_payment_obligations_priority ON payment_obligations(priority, due_date);

COMMENT ON TABLE payment_obligations IS 'Obligations de paiement (comptes fournisseurs, prêts, taxes)';
COMMENT ON COLUMN payment_obligations.priority IS '1=Critique (immédiat), 2=Élevé, 3=Normal, 4=Bas, 5=Flexible';

-- =====================================================
-- TABLE 5: ALERTES DE TRÉSORERIE
-- =====================================================
CREATE TABLE IF NOT EXISTS treasury_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_balance', 'overdue_payment', 'budget_exceeded', 'negative_forecast', 'reconciliation_gap', 'large_transaction')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  threshold_amount DECIMAL(12,2),
  current_value DECIMAL(12,2),
  entity_type TEXT, -- 'bank_account', 'payment_obligation', 'cash_flow_forecast'
  entity_id UUID,
  is_active BOOLEAN DEFAULT true,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  action_required TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_treasury_alerts_active ON treasury_alerts(is_active, severity) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_treasury_alerts_type ON treasury_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_treasury_alerts_triggered ON treasury_alerts(triggered_at DESC);

COMMENT ON TABLE treasury_alerts IS 'Alertes et notifications de trésorerie';
COMMENT ON COLUMN treasury_alerts.severity IS 'info=Information, warning=Attention requise, critical=Action immédiate';

-- =====================================================
-- VUE 1: POSITION DE TRÉSORERIE GLOBALE
-- =====================================================
CREATE OR REPLACE VIEW treasury_position AS
SELECT
  ba.id as bank_account_id,
  ba.name as account_name,
  ba.bank_name,
  ba.currency,
  ba.current_balance,
  ba.available_balance,
  ba.last_reconciliation_date,

  -- Obligations à venir (30 jours)
  COALESCE(SUM(CASE
    WHEN po.status = 'pending' AND po.due_date <= CURRENT_DATE + INTERVAL '30 days'
    THEN po.amount
    ELSE 0
  END), 0) as obligations_30_days,

  -- Obligations en retard
  COALESCE(SUM(CASE
    WHEN po.status = 'overdue'
    THEN po.amount
    ELSE 0
  END), 0) as overdue_amount,

  -- Nombre d'obligations en retard
  COUNT(CASE WHEN po.status = 'overdue' THEN 1 END) as overdue_count,

  -- Trésorerie disponible après obligations
  ba.current_balance - COALESCE(SUM(CASE
    WHEN po.status = 'pending' AND po.due_date <= CURRENT_DATE + INTERVAL '30 days'
    THEN po.amount
    ELSE 0
  END), 0) as net_available_cash,

  -- Jours de trésorerie (runway)
  CASE
    WHEN COALESCE(AVG(daily_outflow.avg_daily), 0) > 0
    THEN ROUND((ba.current_balance / COALESCE(AVG(daily_outflow.avg_daily), 1))::NUMERIC, 1)
    ELSE NULL
  END as days_of_cash,

  ba.is_active
FROM bank_accounts ba
LEFT JOIN payment_obligations po ON po.bank_account_id = ba.id
LEFT JOIN LATERAL (
  SELECT AVG(ABS(amount)) as avg_daily
  FROM bank_transactions bt
  WHERE bt.bank_account_id = ba.id
    AND bt.transaction_type = 'debit'
    AND bt.transaction_date >= CURRENT_DATE - INTERVAL '90 days'
) daily_outflow ON true
WHERE ba.is_active = true
GROUP BY ba.id, ba.name, ba.bank_name, ba.currency, ba.current_balance, ba.available_balance, ba.last_reconciliation_date, ba.is_active;

COMMENT ON VIEW treasury_position IS 'Position de trésorerie temps réel par compte';

-- =====================================================
-- VUE 2: PRÉVISIONS 12 MOIS GLISSANTS
-- =====================================================
CREATE OR REPLACE VIEW cash_flow_12_months AS
SELECT
  DATE_TRUNC('month', forecast_date) as month,
  category,
  currency,

  SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE 0 END) as total_inflows,
  SUM(CASE WHEN flow_type = 'outflow' THEN amount ELSE 0 END) as total_outflows,
  SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE -amount END) as net_cash_flow,

  -- Par catégorie
  SUM(CASE WHEN category = 'operating' AND flow_type = 'inflow' THEN amount ELSE 0 END) as operating_inflows,
  SUM(CASE WHEN category = 'operating' AND flow_type = 'outflow' THEN amount ELSE 0 END) as operating_outflows,
  SUM(CASE WHEN category = 'investing' AND flow_type = 'inflow' THEN amount ELSE 0 END) as investing_inflows,
  SUM(CASE WHEN category = 'investing' AND flow_type = 'outflow' THEN amount ELSE 0 END) as investing_outflows,
  SUM(CASE WHEN category = 'financing' AND flow_type = 'inflow' THEN amount ELSE 0 END) as financing_inflows,
  SUM(CASE WHEN category = 'financing' AND flow_type = 'outflow' THEN amount ELSE 0 END) as financing_outflows,

  -- Niveau de confiance moyen
  ROUND(AVG(confidence_level)::NUMERIC, 1) as avg_confidence
FROM cash_flow_forecast
WHERE forecast_date >= CURRENT_DATE - INTERVAL '6 months'
  AND forecast_date <= CURRENT_DATE + INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', forecast_date), category, currency
ORDER BY month, category;

COMMENT ON VIEW cash_flow_12_months IS 'Flux de trésorerie prévus sur 12 mois glissants';

-- =====================================================
-- VUE 3: TRANSACTIONS NON RAPPROCHÉES
-- =====================================================
CREATE OR REPLACE VIEW unreconciled_transactions AS
SELECT
  bt.id as bank_transaction_id,
  bt.bank_account_id,
  ba.name as account_name,
  bt.transaction_date,
  bt.description,
  bt.amount,
  bt.transaction_type,
  bt.category,
  bt.reference_number,

  -- Transactions similaires non matchées
  (
    SELECT json_agg(
      json_build_object(
        'id', t.id,
        'date', t.date,
        'amount', t.amount,
        'description', t.description,
        'similarity_score', (
          CASE
            WHEN ABS(t.amount - bt.amount) < 0.01 THEN 100
            WHEN ABS(t.amount - bt.amount) < 10 THEN 80
            ELSE 50
          END
        )
      )
    )
    FROM transactions t
    WHERE t.date BETWEEN bt.transaction_date - INTERVAL '7 days' AND bt.transaction_date + INTERVAL '7 days'
      AND ABS(t.amount - ABS(bt.amount)) < 100
      AND t.id NOT IN (SELECT matched_transaction_id FROM bank_transactions WHERE matched_transaction_id IS NOT NULL)
    LIMIT 5
  ) as potential_matches,

  CURRENT_DATE - bt.transaction_date as days_unreconciled
FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE bt.is_reconciled = false
ORDER BY bt.transaction_date DESC;

COMMENT ON VIEW unreconciled_transactions IS 'Transactions bancaires non rapprochées avec suggestions de match';

-- =====================================================
-- FONCTION 1: CALCULER POSITION TRÉSORERIE À DATE FUTURE
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_treasury_position(
  p_target_date DATE,
  p_bank_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
  bank_account_id UUID,
  account_name TEXT,
  current_balance DECIMAL,
  projected_balance DECIMAL,
  projected_inflows DECIMAL,
  projected_outflows DECIMAL,
  risk_level TEXT,
  days_until_critical INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ba.id,
    ba.name,
    ba.current_balance,
    ba.current_balance +
      COALESCE(SUM(CASE WHEN cf.flow_type = 'inflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN cf.flow_type = 'outflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0) as projected_balance,
    COALESCE(SUM(CASE WHEN cf.flow_type = 'inflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0) as projected_inflows,
    COALESCE(SUM(CASE WHEN cf.flow_type = 'outflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0) as projected_outflows,
    CASE
      WHEN (ba.current_balance +
        COALESCE(SUM(CASE WHEN cf.flow_type = 'inflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN cf.flow_type = 'outflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0)) < 10000 THEN 'critical'
      WHEN (ba.current_balance +
        COALESCE(SUM(CASE WHEN cf.flow_type = 'inflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN cf.flow_type = 'outflow' AND cf.forecast_date <= p_target_date THEN cf.amount ELSE 0 END), 0)) < 50000 THEN 'warning'
      ELSE 'healthy'
    END as risk_level,
    NULL::INTEGER as days_until_critical
  FROM bank_accounts ba
  LEFT JOIN cash_flow_forecast cf ON cf.bank_account_id = ba.id OR cf.bank_account_id IS NULL
  WHERE (p_bank_account_id IS NULL OR ba.id = p_bank_account_id)
    AND ba.is_active = true
  GROUP BY ba.id, ba.name, ba.current_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_treasury_position IS 'Calcule la position de trésorerie projetée à une date future';

-- =====================================================
-- FONCTION 2: PRIORISER LES PAIEMENTS
-- =====================================================
CREATE OR REPLACE FUNCTION prioritize_payments(
  p_available_cash DECIMAL,
  p_max_date DATE DEFAULT NULL
)
RETURNS TABLE (
  payment_id UUID,
  vendor_name TEXT,
  description TEXT,
  amount DECIMAL,
  due_date DATE,
  priority_score INTEGER,
  days_overdue INTEGER,
  recommendation TEXT
) AS $$
DECLARE
  v_max_date DATE;
BEGIN
  v_max_date := COALESCE(p_max_date, CURRENT_DATE + INTERVAL '30 days');

  RETURN QUERY
  SELECT
    po.id,
    po.vendor_name,
    po.description,
    po.amount,
    po.due_date,
    -- Score de priorité (1-100, 100 = le plus urgent)
    (
      CASE
        WHEN po.status = 'overdue' THEN 100
        WHEN po.priority = 1 THEN 90
        WHEN po.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 80
        WHEN po.priority = 2 THEN 70
        WHEN po.due_date <= CURRENT_DATE + INTERVAL '14 days' THEN 60
        WHEN po.discount_deadline IS NOT NULL AND po.discount_deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 75
        ELSE 50 - (EXTRACT(DAY FROM po.due_date - CURRENT_DATE)::INTEGER / 2)
      END
    )::INTEGER as priority_score,
    GREATEST(0, CURRENT_DATE - po.due_date)::INTEGER as days_overdue,
    CASE
      WHEN po.status = 'overdue' THEN '🔴 URGENT: Paiement en retard'
      WHEN po.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN '🟡 À payer cette semaine'
      WHEN po.discount_deadline IS NOT NULL AND po.discount_deadline <= CURRENT_DATE + INTERVAL '7 days'
        THEN '💰 Escompte disponible si payé rapidement'
      WHEN p_available_cash < po.amount THEN '⚠️ Trésorerie insuffisante'
      ELSE '🟢 Normal'
    END as recommendation
  FROM payment_obligations po
  WHERE po.status IN ('pending', 'overdue', 'partial')
    AND po.due_date <= v_max_date
  ORDER BY priority_score DESC, po.due_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prioritize_payments IS 'Priorise les paiements en fonction de la trésorerie disponible';

-- =====================================================
-- FONCTION 3: GÉNÉRER ALERTES AUTOMATIQUES
-- =====================================================
CREATE OR REPLACE FUNCTION generate_treasury_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_alert_count INTEGER := 0;
  v_account RECORD;
  v_payment RECORD;
BEGIN
  -- Désactiver les alertes existantes
  UPDATE treasury_alerts SET is_active = false WHERE is_active = true;

  -- ALERTE 1: Solde bancaire faible
  FOR v_account IN
    SELECT * FROM bank_accounts
    WHERE is_active = true
      AND current_balance < 25000
  LOOP
    INSERT INTO treasury_alerts (
      alert_type, severity, title, message,
      threshold_amount, current_value, entity_type, entity_id
    ) VALUES (
      'low_balance',
      CASE WHEN v_account.current_balance < 10000 THEN 'critical' ELSE 'warning' END,
      'Solde bancaire faible - ' || v_account.name,
      'Le compte ' || v_account.name || ' a un solde de ' || v_account.current_balance || ' ' || v_account.currency || ' (seuil: 25,000)',
      25000,
      v_account.current_balance,
      'bank_account',
      v_account.id
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  -- ALERTE 2: Paiements en retard
  FOR v_payment IN
    SELECT * FROM payment_obligations
    WHERE status = 'overdue'
  LOOP
    INSERT INTO treasury_alerts (
      alert_type, severity, title, message,
      threshold_amount, current_value, entity_type, entity_id
    ) VALUES (
      'overdue_payment',
      CASE WHEN v_payment.priority <= 2 THEN 'critical' ELSE 'warning' END,
      'Paiement en retard - ' || v_payment.vendor_name,
      'Paiement de ' || v_payment.amount || ' ' || v_payment.currency || ' en retard depuis le ' || v_payment.due_date,
      0,
      v_payment.amount,
      'payment_obligation',
      v_payment.id
    );
    v_alert_count := v_alert_count + 1;
  END LOOP;

  -- ALERTE 3: Prévision négative dans les 30 jours
  IF EXISTS (
    SELECT 1 FROM cash_flow_12_months
    WHERE month >= DATE_TRUNC('month', CURRENT_DATE)
      AND month <= DATE_TRUNC('month', CURRENT_DATE + INTERVAL '30 days')
      AND net_cash_flow < -50000
  ) THEN
    INSERT INTO treasury_alerts (
      alert_type, severity, title, message
    ) VALUES (
      'negative_forecast',
      'warning',
      'Prévision de trésorerie négative',
      'Les prévisions indiquent un flux de trésorerie négatif important dans les 30 prochains jours'
    );
    v_alert_count := v_alert_count + 1;
  END IF;

  RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_treasury_alerts IS 'Génère automatiquement les alertes de trésorerie';

-- =====================================================
-- TRIGGER 1: AUTO-UPDATE UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_treasury_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_accounts_timestamp
BEFORE UPDATE ON bank_accounts
FOR EACH ROW EXECUTE FUNCTION update_treasury_timestamp();

CREATE TRIGGER update_cash_flow_forecast_timestamp
BEFORE UPDATE ON cash_flow_forecast
FOR EACH ROW EXECUTE FUNCTION update_treasury_timestamp();

CREATE TRIGGER update_payment_obligations_timestamp
BEFORE UPDATE ON payment_obligations
FOR EACH ROW EXECUTE FUNCTION update_treasury_timestamp();

-- =====================================================
-- TRIGGER 2: SYNC TRANSACTIONS → BANK_ACCOUNTS
-- =====================================================
-- Fonction pour mettre à jour le solde bancaire après une transaction
CREATE OR REPLACE FUNCTION sync_bank_balance_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_bank_account_id UUID;
  v_amount_change DECIMAL(12,2);
BEGIN
  -- Déterminer le compte bancaire concerné
  -- (Peut être spécifié dans une future colonne bank_account_id sur transactions)
  -- Pour l'instant, on utilise le compte par défaut en CAD
  SELECT id INTO v_bank_account_id
  FROM bank_accounts
  WHERE currency = 'CAD' AND is_active = true
  LIMIT 1;

  IF v_bank_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculer le changement de solde selon l'opération
  IF TG_OP = 'INSERT' THEN
    v_amount_change := NEW.amount;

    -- Mettre à jour le solde
    UPDATE bank_accounts
    SET current_balance = current_balance + v_amount_change,
        available_balance = current_balance + v_amount_change
    WHERE id = v_bank_account_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Annuler l'ancien montant et ajouter le nouveau
    v_amount_change := NEW.amount - OLD.amount;

    UPDATE bank_accounts
    SET current_balance = current_balance + v_amount_change,
        available_balance = current_balance + v_amount_change
    WHERE id = v_bank_account_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Annuler la transaction
    v_amount_change := -OLD.amount;

    UPDATE bank_accounts
    SET current_balance = current_balance + v_amount_change,
        available_balance = current_balance + v_amount_change
    WHERE id = v_bank_account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER sync_bank_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_bank_balance_from_transaction();

COMMENT ON FUNCTION sync_bank_balance_from_transaction IS 'Synchronise automatiquement le solde bancaire depuis les transactions';

-- =====================================================
-- TRIGGER 3: CRÉER CASH FLOW RÉEL DEPUIS TRANSACTIONS
-- =====================================================
-- Fonction pour enregistrer automatiquement le cash flow réel
CREATE OR REPLACE FUNCTION create_actual_cash_flow_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_category TEXT;
  v_flow_type TEXT;
BEGIN
  -- Déterminer la catégorie selon le type de transaction
  v_category := CASE
    WHEN NEW.type IN ('investissement', 'dividende') THEN 'financing'
    WHEN NEW.type IN ('capex') THEN 'investing'
    ELSE 'operating'
  END;

  -- Déterminer le type de flux (inflow/outflow)
  v_flow_type := CASE
    WHEN NEW.amount > 0 THEN 'inflow'
    ELSE 'outflow'
  END;

  -- Insérer dans cash_flow_forecast comme valeur RÉELLE
  INSERT INTO cash_flow_forecast (
    forecast_date,
    category,
    subcategory,
    flow_type,
    amount,
    currency,
    scenario_id,
    description,
    confidence_level,
    is_actual,
    actual_transaction_id
  ) VALUES (
    NEW.date,
    v_category,
    NEW.type,
    v_flow_type,
    ABS(NEW.amount),
    'CAD', -- TODO: Détecter depuis transaction
    NEW.property_id,
    NEW.description,
    1, -- Confiance maximale (c'est du réel)
    true, -- C'est une valeur réelle, pas une prévision
    NEW.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER create_actual_cash_flow
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION create_actual_cash_flow_from_transaction();

COMMENT ON FUNCTION create_actual_cash_flow_from_transaction IS 'Crée automatiquement une entrée de cash flow réel depuis les transactions';

-- =====================================================
-- TRIGGER 4: MARQUER OBLIGATION PAYÉE
-- =====================================================
-- Fonction pour marquer automatiquement une obligation comme payée
CREATE OR REPLACE FUNCTION mark_obligation_paid_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_obligation RECORD;
BEGIN
  -- Chercher une obligation correspondante (montant similaire, date proche)
  FOR v_obligation IN
    SELECT *
    FROM payment_obligations
    WHERE status = 'pending'
      AND ABS(amount - ABS(NEW.amount)) < 1.0 -- Montant similaire (à 1$ près)
      AND due_date BETWEEN NEW.date - INTERVAL '7 days' AND NEW.date + INTERVAL '7 days'
    ORDER BY ABS(amount - ABS(NEW.amount))
    LIMIT 1
  LOOP
    -- Marquer comme payée
    UPDATE payment_obligations
    SET status = 'paid',
        paid_date = NEW.date,
        paid_amount = ABS(NEW.amount),
        paid_transaction_id = NEW.id
    WHERE id = v_obligation.id;

    EXIT; -- Sortir après le premier match
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER mark_obligation_paid
AFTER INSERT ON transactions
FOR EACH ROW
WHEN (NEW.amount < 0) -- Seulement pour les sorties d'argent
EXECUTE FUNCTION mark_obligation_paid_from_transaction();

COMMENT ON FUNCTION mark_obligation_paid_from_transaction IS 'Marque automatiquement les obligations comme payées quand une transaction correspondante est créée';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 34: MODULE TRÉSORERIE CRÉÉ';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Tables créées:';
  RAISE NOTICE '  - bank_accounts: Comptes bancaires';
  RAISE NOTICE '  - bank_transactions: Transactions importées';
  RAISE NOTICE '  - cash_flow_forecast: Prévisions de trésorerie';
  RAISE NOTICE '  - payment_obligations: Obligations de paiement';
  RAISE NOTICE '  - treasury_alerts: Alertes de trésorerie';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Vues créées:';
  RAISE NOTICE '  - treasury_position: Position temps réel';
  RAISE NOTICE '  - cash_flow_12_months: Prévisions 12 mois';
  RAISE NOTICE '  - unreconciled_transactions: Rapprochement';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Fonctions créées:';
  RAISE NOTICE '  - calculate_treasury_position(): Prévisions futures';
  RAISE NOTICE '  - prioritize_payments(): Priorisation paiements';
  RAISE NOTICE '  - generate_treasury_alerts(): Génération alertes';
  RAISE NOTICE ' ';
  RAISE NOTICE '✓ Module de trésorerie prêt!';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Prochaines étapes:';
  RAISE NOTICE '  1. Créer les comptes bancaires';
  RAISE NOTICE '  2. Importer transactions historiques';
  RAISE NOTICE '  3. Configurer prévisions récurrentes';
  RAISE NOTICE '  4. Setup alertes automatiques (cron job)';
END $$;
