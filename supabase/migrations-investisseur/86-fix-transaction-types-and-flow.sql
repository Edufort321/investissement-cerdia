-- ==========================================
-- MIGRATION 86: CORRIGER LES TYPES DE TRANSACTIONS ET LE FLUX D'ARGENT
-- ==========================================

-- PROBLÈME ACTUEL:
-- 1. La contrainte transactions_type_check ne permet pas 'loyer', 'maintenance', 'admin'
-- 2. Tout est enregistré comme 'investissement' même les SORTIES d'argent
-- 3. Impossible de distinguer: argent QUI ENTRE vs argent QUI SORT

-- SOLUTION:
-- 1. Élargir les types autorisés
-- 2. Utiliser le montant (positif = entrée, négatif = sortie)
-- 3. Clarifier les types selon le flux

-- ==========================================
-- 1. METTRE À JOUR LA CONTRAINTE
-- ==========================================

-- Supprimer l'ancienne contrainte
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Créer la nouvelle contrainte avec TOUS les types nécessaires
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    -- ENTRÉES D'ARGENT (montant positif)
    'investissement',  -- Investisseur achète des parts
    'loyer',          -- Revenus locatifs
    'dividende',      -- Distribution de profits

    -- SORTIES D'ARGENT (montant négatif)
    'achat_propriete', -- Achat de propriété (nouveau type plus clair)
    'depense',        -- Dépense générale
    'capex',          -- Amélioration propriété
    'maintenance',    -- Entretien propriété
    'admin',          -- Frais administratifs
    'courant',        -- Compte courant
    'rnd'             -- Recherche & développement
  ));

COMMENT ON CONSTRAINT transactions_type_check ON transactions IS
  'Types de transactions autorisés - utilisez montant positif pour entrées, négatif pour sorties';

-- ==========================================
-- 2. AJOUTER UNE COLONNE POUR CLARIFIER LE FLUX
-- ==========================================

-- Ajouter colonne flow_direction si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='transactions' AND column_name='flow_direction'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN flow_direction TEXT
    GENERATED ALWAYS AS (
      CASE
        WHEN amount > 0 THEN 'inflow'   -- Entrée d'argent
        WHEN amount < 0 THEN 'outflow'  -- Sortie d'argent
        ELSE 'neutral'
      END
    ) STORED;

    COMMENT ON COLUMN transactions.flow_direction IS
      'Direction du flux: inflow (entrée), outflow (sortie), neutral (0)';
  END IF;
END $$;

-- ==========================================
-- 3. FONCTION: GET_TRANSACTION_DISPLAY_INFO
-- ==========================================

CREATE OR REPLACE FUNCTION get_transaction_display_info(p_transaction_id UUID)
RETURNS TABLE (
  id UUID,
  date TIMESTAMP WITH TIME ZONE,
  type TEXT,
  description TEXT,
  amount DECIMAL(15, 2),
  flow_direction TEXT,
  is_inflow BOOLEAN,
  is_outflow BOOLEAN,
  display_amount TEXT,
  investor_name TEXT,
  property_name TEXT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.date,
    t.type,
    t.description,
    t.amount,
    t.flow_direction,
    (t.amount > 0) as is_inflow,
    (t.amount < 0) as is_outflow,
    CASE
      WHEN t.amount > 0 THEN '+' || TO_CHAR(ABS(t.amount), '999,999,999.99') || ' $'
      WHEN t.amount < 0 THEN '-' || TO_CHAR(ABS(t.amount), '999,999,999.99') || ' $'
      ELSE '0.00 $'
    END as display_amount,
    COALESCE(i.first_name || ' ' || i.last_name, '') as investor_name,
    COALESCE(p.name, '') as property_name,
    t.category
  FROM transactions t
  LEFT JOIN investors i ON t.investor_id = i.id
  LEFT JOIN properties p ON t.property_id = p.id
  WHERE t.id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_transaction_display_info IS
  'Retourne les informations d''affichage d''une transaction avec le flux clarifié';

-- ==========================================
-- 4. VUE: RÉSUMÉ DES FLUX DE TRÉSORERIE
-- ==========================================

CREATE OR REPLACE VIEW cash_flow_summary_v2 AS
SELECT
  'Investissements (entrées)' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions,
  'inflow' as flow_type
FROM transactions
WHERE type = 'investissement' AND amount > 0

UNION ALL

SELECT
  'Revenus locatifs (entrées)' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions,
  'inflow' as flow_type
FROM transactions
WHERE type = 'loyer' AND amount > 0

UNION ALL

SELECT
  'Achats propriétés (sorties)' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions,
  'outflow' as flow_type
FROM transactions
WHERE type IN ('achat_propriete', 'investissement')
  AND property_id IS NOT NULL
  AND amount < 0

UNION ALL

SELECT
  'CAPEX (sorties)' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions,
  'outflow' as flow_type
FROM transactions
WHERE type = 'capex' AND amount < 0

UNION ALL

SELECT
  'Maintenance (sorties)' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions,
  'outflow' as flow_type
FROM transactions
WHERE type = 'maintenance' AND amount < 0

UNION ALL

SELECT
  'Administration (sorties)' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions,
  'outflow' as flow_type
FROM transactions
WHERE type = 'admin' AND amount < 0

UNION ALL

SELECT
  'Dépenses courantes (sorties)' as category,
  COALESCE(SUM(ABS(amount)), 0) as total_cad,
  COUNT(*) as nb_transactions,
  'outflow' as flow_type
FROM transactions
WHERE type IN ('depense', 'courant') AND amount < 0;

COMMENT ON VIEW cash_flow_summary_v2 IS
  'Résumé des flux de trésorerie CORRIGÉ avec distinction entrées/sorties';

-- ==========================================
-- 5. GUIDE D'UTILISATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 GUIDE D''UTILISATION DES TRANSACTIONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '💰 ENTRÉES D''ARGENT (montant POSITIF):';
  RAISE NOTICE '  • type=''investissement'' → Investisseur achète des parts';
  RAISE NOTICE '  • type=''loyer''          → Revenus locatifs';
  RAISE NOTICE '  • type=''dividende''      → Distribution de profits';
  RAISE NOTICE '';
  RAISE NOTICE '💸 SORTIES D''ARGENT (montant NÉGATIF):';
  RAISE NOTICE '  • type=''achat_propriete'' → Achat de propriété';
  RAISE NOTICE '  • type=''depense''         → Dépense générale';
  RAISE NOTICE '  • type=''capex''           → Amélioration propriété';
  RAISE NOTICE '  • type=''maintenance''     → Entretien';
  RAISE NOTICE '  • type=''admin''           → Frais administratifs';
  RAISE NOTICE '';
  RAISE NOTICE '✅ EXEMPLES:';
  RAISE NOTICE '  1. Investisseur achète 10,000 parts à 1$ = 10,000$';
  RAISE NOTICE '     → type=''investissement'', amount=10000.00 (POSITIF)';
  RAISE NOTICE '';
  RAISE NOTICE '  2. Achat Secret Garden H212 pour 180,025.97$';
  RAISE NOTICE '     → type=''achat_propriete'', amount=-180025.97 (NÉGATIF)';
  RAISE NOTICE '';
  RAISE NOTICE '  3. Frais avocat 4,488.29$';
  RAISE NOTICE '     → type=''admin'', amount=-4488.29 (NÉGATIF)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Message de succès
SELECT
  '✅ MIGRATION 86 TERMINÉE' as status,
  'Types de transactions corrigés + Guide d''utilisation' as message;
