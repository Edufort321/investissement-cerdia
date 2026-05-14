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
-- PHASE -1 : PRÉREQUIS MULTI-TENANT (GÉNÉRIQUE)
-- =====================================================
-- Beaucoup de contraintes UNIQUE datent d'avant le multi-tenant et sont
-- GLOBALES (investors.email/username, *_accounts.year,
-- budget_categories.category_code, etc.). Elles bloquent le clone ET,
-- plus largement, empêchent tout 2e tenant d'exister.
--
-- Cette passe trouve TOUTES les contraintes UNIQUE des tables ayant une
-- colonne organization_id qui n'incluent PAS déjà organization_id, et les
-- recrée en préfixant organization_id. Idempotent (skip si déjà par-org).
DO $$
DECLARE
  con record;
  col_names text;
  has_org boolean;
BEGIN
  FOR con IN
    SELECT
      c.conname,
      c.conrelid::regclass::text AS tbl_name,
      c.conrelid AS tbl_oid,
      c.conkey AS col_nums
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE c.contype = 'u'
      AND n.nspname = 'public'
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attname = 'organization_id'
          AND NOT a.attisdropped
      )
  LOOP
    -- organization_id est-il déjà dans la contrainte ?
    SELECT bool_or(a.attname = 'organization_id')
    INTO has_org
    FROM unnest(con.col_nums) AS k(attnum)
    JOIN pg_attribute a ON a.attrelid = con.tbl_oid AND a.attnum = k.attnum;

    IF has_org IS NOT TRUE THEN
      SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO col_names
      FROM unnest(con.col_nums) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.tbl_oid AND a.attnum = k.attnum;

      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', con.tbl_name, con.conname);
      EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I UNIQUE (organization_id, %s)',
        con.tbl_name, left(con.conname || '_org', 63), col_names);
      RAISE NOTICE '[163] UNIQUE % (% ) -> par organisation', con.conname, col_names;
    END IF;
  END LOOP;
END $$;

-- Idem pour les INDEX UNIQUE (CREATE UNIQUE INDEX, pas des contraintes —
-- non visibles dans pg_constraint). Ex: idx_company_settings_key.
DO $$
DECLARE
  idx record;
  col_names text;
  has_org boolean;
  keycols int[];
BEGIN
  FOR idx IN
    SELECT
      ic.relname AS index_name,
      tc.relname AS table_name,
      i.indrelid AS tbl_oid,
      string_to_array(i.indkey::text, ' ')::int[] AS keycols
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = tc.relnamespace
    WHERE i.indisunique
      AND NOT i.indisprimary
      AND n.nspname = 'public'
      -- pas un index qui soutient une contrainte (déjà traité au-dessus)
      AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = i.indexrelid)
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = i.indrelid
          AND a.attname = 'organization_id'
          AND NOT a.attisdropped
      )
  LOOP
    keycols := idx.keycols;
    -- index sur expression (attnum 0) -> on ignore
    CONTINUE WHEN 0 = ANY(keycols);

    SELECT bool_or(a.attname = 'organization_id')
    INTO has_org
    FROM unnest(keycols) AS k(attnum)
    JOIN pg_attribute a ON a.attrelid = idx.tbl_oid AND a.attnum = k.attnum;

    IF has_org IS NOT TRUE THEN
      SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO col_names
      FROM unnest(keycols) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = idx.tbl_oid AND a.attnum = k.attnum;

      EXECUTE format('DROP INDEX %I', idx.index_name);
      EXECUTE format('CREATE UNIQUE INDEX %I ON %I (organization_id, %s)',
        idx.index_name, idx.table_name, col_names);
      RAISE NOTICE '[163] INDEX UNIQUE % (%) -> par organisation', idx.index_name, col_names;
    END IF;
  END LOOP;
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
