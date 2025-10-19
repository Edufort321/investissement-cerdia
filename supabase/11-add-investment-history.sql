-- ==========================================
-- SYSTÈME D'HISTORIQUE DES INVESTISSEMENTS
-- Suivi ligne par ligne avec intégration compte courant
-- ==========================================

-- Étape 1: Créer la table investment_lines pour l'historique détaillé
CREATE TABLE IF NOT EXISTS investment_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,

  -- Informations de l'investissement
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  amount_cad DECIMAL(12, 2), -- Montant converti en CAD si original en USD
  exchange_rate DECIMAL(10, 4), -- Taux de change si applicable

  -- Type et catégorie
  investment_type VARCHAR(50) DEFAULT 'capital', -- capital, dette, mixte
  class VARCHAR(10), -- A, B, C
  shares_issued DECIMAL(12, 2) DEFAULT 0, -- Nombre de parts émises
  share_value DECIMAL(12, 2), -- Valeur par part

  -- Lien avec transaction (si créé via compte courant)
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  -- Détails
  description TEXT,
  notes TEXT,
  payment_method VARCHAR(50), -- virement, cheque, especes

  -- Statut
  status VARCHAR(20) DEFAULT 'confirmed', -- pending, confirmed, cancelled

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_investment_lines_investor ON investment_lines(investor_id);
CREATE INDEX IF NOT EXISTS idx_investment_lines_date ON investment_lines(date);
CREATE INDEX IF NOT EXISTS idx_investment_lines_transaction ON investment_lines(transaction_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_investment_line_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_investment_line_updated_at
BEFORE UPDATE ON investment_lines
FOR EACH ROW
EXECUTE FUNCTION update_investment_line_updated_at();

-- Étape 2: Fonction pour créer automatiquement une ligne d'investissement
-- depuis une transaction du compte courant
CREATE OR REPLACE FUNCTION create_investment_line_from_transaction(
  p_transaction_id UUID,
  p_investor_id UUID,
  p_amount DECIMAL(12, 2),
  p_currency VARCHAR(3),
  p_class VARCHAR(10),
  p_share_value DECIMAL(12, 2)
) RETURNS UUID AS $$
DECLARE
  v_investment_line_id UUID;
  v_shares_issued DECIMAL(12, 2);
  v_amount_cad DECIMAL(12, 2);
  v_exchange_rate DECIMAL(10, 4);
  v_transaction_date DATE;
  v_transaction_desc TEXT;
BEGIN
  -- Récupérer les infos de la transaction
  SELECT date, description
  INTO v_transaction_date, v_transaction_desc
  FROM transactions
  WHERE id = p_transaction_id;

  -- Calculer le montant en CAD si nécessaire
  IF p_currency = 'CAD' THEN
    v_amount_cad := p_amount;
    v_exchange_rate := 1.0;
  ELSE
    -- Utiliser le taux actuel ou un taux par défaut
    SELECT rate INTO v_exchange_rate
    FROM exchange_rates
    WHERE from_currency = p_currency AND to_currency = 'CAD'
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_exchange_rate IS NULL THEN
      v_exchange_rate := 1.35; -- Taux par défaut USD→CAD
    END IF;

    v_amount_cad := p_amount * v_exchange_rate;
  END IF;

  -- Calculer les parts émises
  IF p_share_value > 0 THEN
    v_shares_issued := v_amount_cad / p_share_value;
  ELSE
    v_shares_issued := 0;
  END IF;

  -- Créer la ligne d'investissement
  INSERT INTO investment_lines (
    investor_id,
    date,
    amount,
    currency,
    amount_cad,
    exchange_rate,
    investment_type,
    class,
    shares_issued,
    share_value,
    transaction_id,
    description,
    payment_method,
    status
  ) VALUES (
    p_investor_id,
    v_transaction_date,
    p_amount,
    p_currency,
    v_amount_cad,
    v_exchange_rate,
    'capital',
    p_class,
    v_shares_issued,
    p_share_value,
    p_transaction_id,
    v_transaction_desc || ' - Investissement',
    'virement',
    'confirmed'
  )
  RETURNING id INTO v_investment_line_id;

  RETURN v_investment_line_id;
END;
$$ LANGUAGE plpgsql;

-- Étape 3: Fonction pour mettre à jour automatiquement le total de l'investisseur
CREATE OR REPLACE FUNCTION update_investor_totals_from_lines(p_investor_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_invested_cad DECIMAL(12, 2);
  v_total_shares DECIMAL(12, 2);
  v_current_value DECIMAL(12, 2);
  v_share_value DECIMAL(12, 2);
  v_action_class VARCHAR(10);
BEGIN
  -- Calculer les totaux depuis investment_lines
  SELECT
    COALESCE(SUM(amount_cad), 0),
    COALESCE(SUM(shares_issued), 0)
  INTO v_total_invested_cad, v_total_shares
  FROM investment_lines
  WHERE investor_id = p_investor_id
    AND status = 'confirmed';

  -- Obtenir la valeur par part actuelle (dernière ligne ou valeur par défaut)
  SELECT share_value, class
  INTO v_share_value, v_action_class
  FROM investment_lines
  WHERE investor_id = p_investor_id
    AND share_value IS NOT NULL
  ORDER BY date DESC
  LIMIT 1;

  -- Si pas de valeur par part, utiliser celle de l'investisseur
  IF v_share_value IS NULL THEN
    SELECT share_value, action_class
    INTO v_share_value, v_action_class
    FROM investors
    WHERE id = p_investor_id;
  END IF;

  -- Calculer la valeur actuelle
  v_current_value := v_total_shares * COALESCE(v_share_value, 1000);

  -- Mettre à jour l'investisseur
  UPDATE investors
  SET
    total_invested = v_total_invested_cad,
    total_shares = v_total_shares,
    current_value = v_current_value,
    action_class = COALESCE(v_action_class, action_class),
    updated_at = NOW()
  WHERE id = p_investor_id;

  -- Recalculer le pourcentage de propriété pour tous les investisseurs
  PERFORM update_all_ownership_percentages();

END;
$$ LANGUAGE plpgsql;

-- Étape 4: Fonction pour recalculer les pourcentages de propriété
CREATE OR REPLACE FUNCTION update_all_ownership_percentages()
RETURNS VOID AS $$
DECLARE
  v_total_invested DECIMAL(12, 2);
BEGIN
  -- Calculer le total investi
  SELECT COALESCE(SUM(total_invested), 0)
  INTO v_total_invested
  FROM investors
  WHERE status = 'actif';

  -- Mettre à jour chaque investisseur
  IF v_total_invested > 0 THEN
    UPDATE investors
    SET percentage_ownership = (total_invested / v_total_invested) * 100
    WHERE status = 'actif';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Étape 5: Trigger pour mettre à jour l'investisseur quand une ligne change
CREATE OR REPLACE FUNCTION trigger_update_investor_on_line_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_investor_totals_from_lines(OLD.investor_id);
    RETURN OLD;
  ELSE
    PERFORM update_investor_totals_from_lines(NEW.investor_id);

    -- Si l'investor_id a changé, mettre à jour aussi l'ancien
    IF TG_OP = 'UPDATE' AND OLD.investor_id IS DISTINCT FROM NEW.investor_id THEN
      PERFORM update_investor_totals_from_lines(OLD.investor_id);
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_investor_on_investment_line
AFTER INSERT OR UPDATE OR DELETE ON investment_lines
FOR EACH ROW
EXECUTE FUNCTION trigger_update_investor_on_line_change();

-- Étape 6: Vue pour l'historique complet des investissements
CREATE OR REPLACE VIEW investment_history AS
SELECT
  il.*,
  i.first_name,
  i.last_name,
  i.email,
  i.username,
  CONCAT(i.first_name, ' ', i.last_name) as investor_name,
  t.type as transaction_type,
  t.payment_method as transaction_payment_method
FROM investment_lines il
JOIN investors i ON i.id = il.investor_id
LEFT JOIN transactions t ON t.id = il.transaction_id
ORDER BY il.date DESC, il.created_at DESC;

-- Étape 7: Fonction pour créer rapidement un nouvel investisseur depuis le compte courant
CREATE OR REPLACE FUNCTION quick_create_investor(
  p_first_name VARCHAR(100),
  p_last_name VARCHAR(100),
  p_email VARCHAR(255),
  p_class VARCHAR(10) DEFAULT 'A',
  p_share_value DECIMAL(12, 2) DEFAULT 1000
) RETURNS UUID AS $$
DECLARE
  v_investor_id UUID;
  v_username VARCHAR(100);
BEGIN
  -- Générer un username unique
  v_username := LOWER(SUBSTRING(p_first_name, 1, 1) || p_last_name);

  -- Vérifier si le username existe déjà et ajouter un suffixe si nécessaire
  WHILE EXISTS (SELECT 1 FROM investors WHERE username = v_username) LOOP
    v_username := v_username || FLOOR(RANDOM() * 100)::TEXT;
  END LOOP;

  -- Créer l'investisseur
  INSERT INTO investors (
    first_name,
    last_name,
    email,
    username,
    action_class,
    share_value,
    total_invested,
    total_shares,
    current_value,
    percentage_ownership,
    investment_type,
    status,
    access_level,
    join_date
  ) VALUES (
    p_first_name,
    p_last_name,
    p_email,
    v_username,
    p_class,
    p_share_value,
    0,
    0,
    0,
    0,
    'capital',
    'actif',
    'investor',
    CURRENT_DATE
  )
  RETURNING id INTO v_investor_id;

  RETURN v_investor_id;
END;
$$ LANGUAGE plpgsql;

-- Étape 8: Vue pour le résumé des investissements par investisseur
CREATE OR REPLACE VIEW investor_investment_summary AS
SELECT
  i.id as investor_id,
  i.first_name,
  i.last_name,
  i.email,
  CONCAT(i.first_name, ' ', i.last_name) as investor_name,
  i.action_class,
  i.total_invested,
  i.total_shares,
  i.current_value,
  i.percentage_ownership,

  COUNT(il.id) as number_of_investments,
  MIN(il.date) as first_investment_date,
  MAX(il.date) as last_investment_date,
  AVG(il.amount_cad) as average_investment_amount,

  SUM(CASE WHEN il.currency = 'CAD' THEN il.amount ELSE 0 END) as total_invested_cad_direct,
  SUM(CASE WHEN il.currency = 'USD' THEN il.amount ELSE 0 END) as total_invested_usd,
  SUM(il.amount_cad) as total_invested_cad_converted

FROM investors i
LEFT JOIN investment_lines il ON il.investor_id = i.id AND il.status = 'confirmed'
GROUP BY
  i.id, i.first_name, i.last_name, i.email,
  i.action_class, i.total_invested, i.total_shares,
  i.current_value, i.percentage_ownership
ORDER BY i.total_invested DESC;

-- Étape 9: RLS (Row Level Security) pour investment_lines
ALTER TABLE investment_lines ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout voir
CREATE POLICY "Admin peut tout voir sur investment_lines"
ON investment_lines FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- Les investisseurs peuvent voir leurs propres lignes
CREATE POLICY "Investisseur peut voir ses lignes"
ON investment_lines FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.id = investment_lines.investor_id
    AND investors.user_id = auth.uid()
  )
);

-- Les admins peuvent tout modifier
CREATE POLICY "Admin peut tout modifier sur investment_lines"
ON investment_lines FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investors
    WHERE investors.user_id = auth.uid()
    AND investors.access_level = 'admin'
  )
);

-- Vérification finale
SELECT
  '✅ SYSTÈME D''HISTORIQUE DES INVESTISSEMENTS CRÉÉ' as status,
  'Table: investment_lines' as tables,
  'Fonctions: create_investment_line_from_transaction, update_investor_totals_from_lines, quick_create_investor' as functions,
  'Vues: investment_history, investor_investment_summary' as views,
  'Triggers: Auto-update investor totals on line change' as triggers;

-- Exemples d'utilisation:
COMMENT ON TABLE investment_lines IS '
Exemples d''utilisation:

1. Créer rapidement un nouvel investisseur:
   SELECT quick_create_investor(''Jean'', ''Dupont'', ''jean@example.com'', ''A'', 1000);

2. Ajouter une ligne d''investissement depuis une transaction:
   SELECT create_investment_line_from_transaction(
     ''transaction-uuid'',
     ''investor-uuid'',
     50000.00,
     ''CAD'',
     ''A'',
     1000.00
   );

3. Voir l''historique complet:
   SELECT * FROM investment_history WHERE investor_id = ''uuid'';

4. Voir le résumé par investisseur:
   SELECT * FROM investor_investment_summary;

5. Ajouter manuellement une ligne:
   INSERT INTO investment_lines (investor_id, date, amount, currency, class, share_value, description)
   VALUES (''uuid'', ''2025-01-15'', 25000, ''CAD'', ''A'', 1000, ''Investissement initial'');
   -- Les totaux de l''investisseur se mettent à jour automatiquement!
';
