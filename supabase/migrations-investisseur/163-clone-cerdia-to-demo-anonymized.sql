-- =====================================================
-- MIGRATION 163: CLONE CERDIA GLOBALE -> DEMO (ANONYMISÉ)
-- =====================================================
-- Objectif :
--   Peupler le tenant DEMO public avec une copie de la structure réelle
--   de CERDIA Globale, mais ENTIÈREMENT ANONYMISÉE :
--     - noms d'investisseurs / promoteurs / courtiers / projets : génériques
--     - montants : multipliés par un facteur global aléatoire (0.85–1.15)
--       -> chiffres obscurcis MAIS internement cohérents (NAV, transactions,
--          parts restent proportionnels = démo crédible)
--
--   Le livre d'entreprise (corporate_book*) est EXCLU.
--
-- Méthode (générique, sans hardcoder le graphe de FK) :
--   Phase 0 : purge le tenant DEMO (idempotent, re-exécutable)
--   Phase 1 : génère tous les nouveaux UUID (mapping old->new) pour TOUTES
--             les lignes de toutes les tables tenant-scoped en une passe
--   Phase 2 : clone chaque table — chaque colonne uuid est remappée via le
--             mapping (si présente) sinon conservée. Pas besoin de tri
--             topologique car tous les new id existent déjà avant le clone.
--   Phase 3 : anonymisation (noms + facteur montants global)
--
-- Dépendances : 145 (organizations), 146 (organization_id), 158 (DEMO tenant)
-- Re-exécutable : oui (purge-first)
-- Note : les fichiers Storage ne sont PAS copiés — les URLs des pièces
--   jointes pointeront vers les fichiers d'origine (acceptable pour un démo).
-- =====================================================

-- =====================================================
-- PHASE -1 : PRÉREQUIS MULTI-TENANT
-- =====================================================
-- Certaines contraintes UNIQUE datent d'avant le multi-tenant et sont
-- GLOBALES (investors.email, investors.username, *_accounts.year). Elles
-- bloqueraient le clone ET, plus largement, empêchent tout 2e tenant
-- d'exister. On les convertit en UNIQUE par organisation.
DO $$
BEGIN
  -- investors.email -> unique par organisation
  ALTER TABLE investors DROP CONSTRAINT IF EXISTS investors_email_key;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investors_org_email_key') THEN
    ALTER TABLE investors ADD CONSTRAINT investors_org_email_key UNIQUE (organization_id, email);
  END IF;

  -- investors.username -> unique par organisation
  ALTER TABLE investors DROP CONSTRAINT IF EXISTS investors_username_key;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investors_org_username_key') THEN
    ALTER TABLE investors ADD CONSTRAINT investors_org_username_key UNIQUE (organization_id, username);
  END IF;

  -- capex_accounts.year -> unique par organisation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='capex_accounts') THEN
    ALTER TABLE capex_accounts DROP CONSTRAINT IF EXISTS capex_accounts_year_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capex_accounts_org_year_key') THEN
      ALTER TABLE capex_accounts ADD CONSTRAINT capex_accounts_org_year_key UNIQUE (organization_id, year);
    END IF;
  END IF;

  -- current_accounts.year -> unique par organisation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='current_accounts') THEN
    ALTER TABLE current_accounts DROP CONSTRAINT IF EXISTS current_accounts_year_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'current_accounts_org_year_key') THEN
      ALTER TABLE current_accounts ADD CONSTRAINT current_accounts_org_year_key UNIQUE (organization_id, year);
    END IF;
  END IF;

  -- rnd_accounts.year -> unique par organisation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rnd_accounts') THEN
    ALTER TABLE rnd_accounts DROP CONSTRAINT IF EXISTS rnd_accounts_year_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rnd_accounts_org_year_key') THEN
      ALTER TABLE rnd_accounts ADD CONSTRAINT rnd_accounts_org_year_key UNIQUE (organization_id, year);
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  src_org uuid := 'c0000000-0000-0000-0000-000000000001';  -- CERDIA Globale
  dst_org uuid := 'd0000000-0000-0000-0000-000000000001';  -- DEMO
  -- Tables exclues du clone : livre d'entreprise, tables système, tokens uniques
  excluded text[] := ARRAY[
    'corporate_book', 'corporate_book_documents',
    'organizations', 'profiles', 'audit_log', 'share_links'
  ];
  amount_factor numeric := round((0.85 + random() * 0.30)::numeric, 4);
  tbl record;
  col record;
  has_id boolean;
  col_list text;
  select_list text;
  rows_n int;
  total_n int := 0;
BEGIN
  -- Désactive les FK + triggers pour cette transaction : le clone insère
  -- les tables dans un ordre arbitraire mais tous les UUID sont pré-générés
  -- (Phase 1), donc l'intégrité référentielle est garantie à la fin.
  -- SET LOCAL -> réinitialisé automatiquement au COMMIT.
  SET LOCAL session_replication_role = 'replica';

  -- Mapping global old_id -> new_id (UUID globalement uniques -> une seule table suffit)
  CREATE TEMP TABLE _clone_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;

  -- ============ PHASE 0 : PURGE DU TENANT DEMO ============
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> ALL(excluded)
  LOOP
    EXECUTE format('DELETE FROM %I WHERE organization_id = %L', tbl.table_name, dst_org);
  END LOOP;

  -- ============ PHASE 1 : GÉNÉRATION DES NOUVEAUX UUID ============
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> ALL(excluded)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl.table_name
        AND column_name = 'id' AND data_type = 'uuid'
    ) INTO has_id;

    IF has_id THEN
      EXECUTE format(
        'INSERT INTO _clone_map (old_id, new_id)
         SELECT id, gen_random_uuid() FROM %I
         WHERE organization_id = %L AND id IS NOT NULL
         ON CONFLICT (old_id) DO NOTHING',
        tbl.table_name, src_org
      );
    END IF;
  END LOOP;

  -- ============ PHASE 2 : CLONE DE CHAQUE TABLE ============
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> ALL(excluded)
  LOOP
    col_list := '';
    select_list := '';

    FOR col IN
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl.table_name
        -- on ignore les colonnes générées / identité (INSERT interdit)
        AND is_generated = 'NEVER'
        AND is_identity = 'NO'
      ORDER BY ordinal_position
    LOOP
      col_list := col_list || quote_ident(col.column_name) || ',';

      IF col.column_name = 'organization_id' THEN
        -- réaffecté au tenant DEMO
        select_list := select_list || quote_literal(dst_org) || '::uuid,';
      ELSIF col.data_type = 'uuid' THEN
        -- remappé si la valeur correspond à une ligne clonée, sinon conservé
        select_list := select_list || format(
          'COALESCE((SELECT m.new_id FROM _clone_map m WHERE m.old_id = t.%I), t.%I),',
          col.column_name, col.column_name
        );
      ELSE
        select_list := select_list || 't.' || quote_ident(col.column_name) || ',';
      END IF;
    END LOOP;

    col_list := rtrim(col_list, ',');
    select_list := rtrim(select_list, ',');

    IF col_list <> '' THEN
      EXECUTE format(
        'INSERT INTO %I (%s) SELECT %s FROM %I t WHERE t.organization_id = %L',
        tbl.table_name, col_list, select_list, tbl.table_name, src_org
      );
      GET DIAGNOSTICS rows_n = ROW_COUNT;
      total_n := total_n + rows_n;
      RAISE NOTICE '[163] % : % lignes clonées', tbl.table_name, rows_n;
    END IF;
  END LOOP;

  -- ============ PHASE 3 : ANONYMISATION ============

  -- --- Noms d'investisseurs ---
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='investors') THEN
    WITH numbered AS (
      SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS n
      FROM investors WHERE organization_id = dst_org
    )
    UPDATE investors i SET
      first_name = 'Investisseur',
      last_name  = 'Démo ' || numbered.n,
      email      = 'investisseur' || numbered.n || '@demo.cerdia.ai',
      phone      = NULL,
      username   = 'demo_inv_' || numbered.n
    FROM numbered
    WHERE i.id = numbered.id;
  END IF;

  -- --- Noms de projets / propriétés ---
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='properties') THEN
    WITH numbered AS (
      SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS n
      FROM properties WHERE organization_id = dst_org
    )
    UPDATE properties p SET
      name = 'Propriété Démo ' || numbered.n
    FROM numbered
    WHERE p.id = numbered.id;
  END IF;

  -- --- Noms de scénarios + intervenants ---
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='scenarios') THEN
    WITH numbered AS (
      SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS n
      FROM scenarios WHERE organization_id = dst_org
    )
    UPDATE scenarios s SET
      name          = 'Projet Démo ' || numbered.n,
      promoter_name = 'Promoteur Démo',
      broker_name   = 'Courtier Démo',
      broker_email  = 'courtier@demo.cerdia.ai',
      company_name  = 'Compagnie Démo Inc.'
    FROM numbered
    WHERE s.id = numbered.id;
  END IF;

  -- --- Montants : facteur global appliqué aux colonnes monétaires ---
  -- Pattern d'inclusion = colonnes d'argent ; exclusion = taux/%/compteurs/parts.
  -- Un facteur unique préserve la cohérence interne (NAV = parts x prix, etc.)
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> ALL(excluded)
  LOOP
    FOR col IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl.table_name
        AND data_type IN ('numeric', 'double precision', 'real', 'integer', 'bigint')
        AND is_generated = 'NEVER'
        AND column_name ~* '(amount|cost|price|balance|deposit|total|net_income|gross_income|cashflow|capital|nav|fee|fees|loan_amount|payment|revenue|income|expense|salary|proceeds|valuation)'
        AND column_name !~* '(rate|pct|percent|ratio|occupancy|interest|appreciation|year|duration|count|number|days|month|qty|quantity|term|increase|_id$|shares|units|order|version|priority|sequence|score|level|age)'
    LOOP
      EXECUTE format(
        'UPDATE %I SET %I = %I * %s WHERE organization_id = %L AND %I IS NOT NULL',
        tbl.table_name, col.column_name, col.column_name, amount_factor, dst_org, col.column_name
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE '====================================================';
  RAISE NOTICE '[163] CLONE DEMO TERMINÉ';
  RAISE NOTICE '[163] Total lignes clonées : %', total_n;
  RAISE NOTICE '[163] Facteur montants appliqué : %', amount_factor;
  RAISE NOTICE '====================================================';
END $$;

-- Vérification
SELECT
  '✅ MIGRATION 163 — CLONE DEMO ANONYMISÉ' as status,
  (SELECT count(*) FROM investors WHERE organization_id = 'd0000000-0000-0000-0000-000000000001') as investisseurs_demo,
  (SELECT count(*) FROM properties WHERE organization_id = 'd0000000-0000-0000-0000-000000000001') as proprietes_demo,
  (SELECT count(*) FROM scenarios WHERE organization_id = 'd0000000-0000-0000-0000-000000000001') as scenarios_demo,
  (SELECT count(*) FROM transactions WHERE organization_id = 'd0000000-0000-0000-0000-000000000001') as transactions_demo;
