-- Migration 208 : Retire le DEFAULT organization_id = CERDIA (anti-contamination)
-- =====================================================================
-- CAUSE RACINE DE LA CONTAMINATION ENTRE TENANTS :
-- La migration 146 a posé `organization_id UUID NOT NULL DEFAULT '<CERDIA>'`
-- sur ~56 tables. Conséquence : TOUTE insertion qui n'envoie pas explicitement
-- organization_id tombe SILENCIEUSEMENT dans le tenant CERDIA — peu importe le
-- tenant réellement actif (ex: super_admin en « View as DEMO »). C'est ainsi que
-- des données démo se retrouvent dans CERDIA.
--
-- CORRECTIF : retirer le DEFAULT. La colonne reste NOT NULL → un insert sans
-- organization_id ÉCHOUE bruyamment (violation NOT NULL) au lieu de contaminer.
-- Plus aucune fuite silencieuse possible, pour CERDIA comme pour les FUTURS tenants.
--
-- ⚠ NON-DESTRUCTIF : ne touche aucune donnée existante, ne change pas NOT NULL,
--   ne touche pas aux FK ni aux index. Retire seulement la valeur par défaut.
-- ⚠ Le code applicatif doit désormais TOUJOURS fournir organization_id (la plupart
--   des chemins le font déjà via effectiveOrgId ; les exceptions sont corrigées
--   côté code dans le même lot).
-- =====================================================================

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    -- Core
    'investors','properties','transactions','documents','dividends','dividend_allocations',
    'capex_accounts','current_accounts','rnd_accounts','operational_expenses','reports',
    -- Investisseurs (relations)
    'investor_investments','investor_debts','investor_reservations','investor_properties',
    -- Propriétés
    'property_attachments','property_links','property_valuations','property_management_api',
    -- Tracking financier
    'nav_history','share_price_history','share_links','liabilities','payment_schedules',
    'transaction_attachments','audit_log','monthly_verifications',
    -- Scénarios
    'scenarios','scenario_results','scenario_votes','scenario_documents',
    'scenario_actual_values','scenario_bookings',
    -- Trésorerie
    'bank_accounts','bank_transactions','cash_flow_forecast','payment_obligations','treasury_alerts',
    -- Projets
    'contractors','project_phases','project_milestones','project_risks',
    'project_assignments','project_documents',
    -- Budgeting
    'budget_categories','budgets','budget_lines','budget_revisions','budget_approvals','budget_alerts',
    -- Livre corporatif
    'corporate_book','corporate_book_documents','company_settings',
    -- Productivité
    'todo_lists','tasks','notes',
    -- Commerce / Gmail (mig 148/149, même DEFAULT)
    'commerce_products','commerce_transactions','commerce_platforms','gmail_invoices',
    -- Facturation
    'invoices','invoice_items','invoice_clients',
    -- Dividendes (mig 202) + fiscal
    'dividend_declarations','dividend_investor_elections','fiscal_year_settings',
    'investor_report_requests'
  ];
  v_done INT := 0;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'organization_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id DROP DEFAULT', v_table);
      v_done := v_done + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Migration 208 : DEFAULT organization_id retiré sur % table(s).', v_done;
END $$;

-- Vérification : aucune des tables listées ne doit conserver un column_default.
SELECT
  'Tables avec DEFAULT organization_id restant (doit etre 0)' AS controle,
  COUNT(*) AS nb
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'organization_id'
  AND column_default IS NOT NULL;
