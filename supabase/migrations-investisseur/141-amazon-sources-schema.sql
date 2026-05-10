-- ============================================================
-- Migration 141 : tables sources Amazon
--
-- Tables ou les syncs SP-API / Ads API ecrivent. L'agent les lit pour
-- generer ses propositions (pending_actions).
--
-- Tables :
--   - amazon_credentials      : tokens chiffres (1 row par marketplace)
--   - amazon_sync_state       : etat des differents syncs (idempotence + monitoring)
--   - amazon_orders           : commandes SP-API (clients/dates/totaux)
--   - amazon_order_items      : lignes de commande (ASIN, SKU, qty, prix)
--   - amazon_listings         : catalogue + stock + prix + Buy Box + garde-fous prix
--   - amazon_ads_keywords     : keywords Sponsored Products + metrics 30j
--   - amazon_search_terms     : search terms report (par jour, par campagne)
--
-- Pre-requis : migration 139 (profiles + roles).
-- Idempotent.
-- ============================================================

-- ── 1. amazon_credentials ────────────────────────────────────
-- Stocke les refresh tokens chiffres AES-256-GCM (cle hors-DB :
-- AMAZON_REFRESH_TOKEN_ENCRYPTION_KEY dans .env.local).
CREATE TABLE IF NOT EXISTS amazon_credentials (
    id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_id                  TEXT        NOT NULL UNIQUE,
    seller_id                       TEXT        NOT NULL,
    ads_profile_id                  BIGINT,
    sp_api_refresh_token_encrypted  BYTEA,      -- nullable tant que SP-API pas approuve
    ads_api_refresh_token_encrypted BYTEA,      -- nullable tant que Ads pas whitelisted
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE amazon_credentials ENABLE ROW LEVEL SECURITY;
-- Aucune lecture par authenticated (memes admins) : seul service_role.
-- Les routes API server-side decryptent en memoire avec la cle env.


-- ── 2. amazon_sync_state ─────────────────────────────────────
-- Idempotence + monitoring des syncs : chaque resource a sa row.
CREATE TABLE IF NOT EXISTS amazon_sync_state (
    resource          TEXT        PRIMARY KEY,    -- 'orders' | 'listings' | 'ads_keywords' | 'search_terms' | 'inventory'
    last_attempted_at TIMESTAMPTZ,
    last_completed_at TIMESTAMPTZ,
    last_error        TEXT,
    is_running        BOOLEAN     NOT NULL DEFAULT FALSE,
    rows_imported     INTEGER     DEFAULT 0,
    metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb    -- ex : { reportId, status } pour les async reports
);

ALTER TABLE amazon_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_sync_state" ON amazon_sync_state;
CREATE POLICY "admin_read_sync_state" ON amazon_sync_state
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 3. amazon_orders + amazon_order_items ────────────────────
CREATE TABLE IF NOT EXISTS amazon_orders (
    amazon_order_id     TEXT        PRIMARY KEY,     -- ex: 702-1234567-1234567
    marketplace_id      TEXT        NOT NULL,
    purchase_date       TIMESTAMPTZ NOT NULL,
    last_update_date    TIMESTAMPTZ,
    order_status        TEXT,                         -- Pending | Unshipped | Shipped | Canceled | etc.
    fulfillment_channel TEXT,                         -- AFN (FBA) | MFN (Merchant)
    sales_channel       TEXT,                         -- Amazon.ca, etc.
    order_total_cents   INTEGER,
    currency            TEXT,
    number_of_items     INTEGER,
    is_business_order   BOOLEAN,
    is_premium_order    BOOLEAN,
    raw                 JSONB,                        -- payload complet pour reprise
    inserted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amazon_orders_purchase  ON amazon_orders (purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_status    ON amazon_orders (order_status);
CREATE INDEX IF NOT EXISTS idx_amazon_orders_market    ON amazon_orders (marketplace_id);

ALTER TABLE amazon_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_orders" ON amazon_orders;
CREATE POLICY "admin_read_orders" ON amazon_orders
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


CREATE TABLE IF NOT EXISTS amazon_order_items (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    amazon_order_id     TEXT        NOT NULL REFERENCES amazon_orders(amazon_order_id) ON DELETE CASCADE,
    asin                TEXT        NOT NULL,
    seller_sku          TEXT,
    title               TEXT,
    quantity_ordered    INTEGER     NOT NULL,
    quantity_shipped    INTEGER,
    item_price_cents    INTEGER,
    item_tax_cents      INTEGER,
    shipping_price_cents INTEGER,
    currency            TEXT,
    UNIQUE (amazon_order_id, asin, seller_sku)
);

CREATE INDEX IF NOT EXISTS idx_order_items_asin ON amazon_order_items (asin);

ALTER TABLE amazon_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_order_items" ON amazon_order_items;
CREATE POLICY "admin_read_order_items" ON amazon_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 4. amazon_listings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_listings (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_id        TEXT        NOT NULL,
    asin                  TEXT        NOT NULL,
    sku                   TEXT        NOT NULL,
    title                 TEXT,
    price_cents           INTEGER,
    currency              TEXT,
    buy_box_winner        BOOLEAN,
    fulfillable_quantity  INTEGER,
    rating                NUMERIC(3,2),
    review_count          INTEGER,
    -- Garde-fous de prix (a remplir manuellement par produit)
    cogs_cents            INTEGER,
    fba_fees_cents        INTEGER,
    price_min_cents       INTEGER,
    price_max_cents       INTEGER,
    map_price_cents       INTEGER,
    min_margin_pct        NUMERIC(5,2) DEFAULT 20.0,
    -- Metadata
    raw                   JSONB,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (marketplace_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_listings_asin    ON amazon_listings (asin);
CREATE INDEX IF NOT EXISTS idx_listings_market  ON amazon_listings (marketplace_id);

ALTER TABLE amazon_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_rw_listings" ON amazon_listings;
CREATE POLICY "admin_rw_listings" ON amazon_listings
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 5. amazon_ads_keywords (avec metrics 30j) ────────────────
CREATE TABLE IF NOT EXISTS amazon_ads_keywords (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_id    TEXT        NOT NULL,
    profile_id        BIGINT      NOT NULL,
    campaign_id       BIGINT      NOT NULL,
    ad_group_id       BIGINT      NOT NULL,
    keyword_id        BIGINT      NOT NULL,
    keyword_text      TEXT        NOT NULL,
    match_type        TEXT        NOT NULL,       -- BROAD | PHRASE | EXACT
    state             TEXT        NOT NULL,       -- enabled | paused | archived
    bid_cents         INTEGER     NOT NULL,
    -- Metrics rolling 30j
    clicks_30d        INTEGER     DEFAULT 0,
    impressions_30d   INTEGER     DEFAULT 0,
    spend_cents_30d   INTEGER     DEFAULT 0,
    orders_30d        INTEGER     DEFAULT 0,
    sales_cents_30d   INTEGER     DEFAULT 0,
    acos_30d          NUMERIC(6,2),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (marketplace_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_kw_state    ON amazon_ads_keywords (state);
CREATE INDEX IF NOT EXISTS idx_kw_acos     ON amazon_ads_keywords (acos_30d);
CREATE INDEX IF NOT EXISTS idx_kw_campaign ON amazon_ads_keywords (campaign_id);

ALTER TABLE amazon_ads_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_keywords" ON amazon_ads_keywords;
CREATE POLICY "admin_read_keywords" ON amazon_ads_keywords
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 6. amazon_search_terms (par jour, par keyword) ──────────
CREATE TABLE IF NOT EXISTS amazon_search_terms (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace_id  TEXT        NOT NULL,
    date            DATE        NOT NULL,
    campaign_id     BIGINT      NOT NULL,
    ad_group_id     BIGINT      NOT NULL,
    keyword_id      BIGINT,
    keyword_text    TEXT,
    match_type      TEXT,
    search_term     TEXT        NOT NULL,
    impressions     INTEGER,
    clicks          INTEGER,
    spend_cents     INTEGER,
    orders_7d       INTEGER,
    sales_cents_7d  INTEGER,
    UNIQUE (marketplace_id, date, campaign_id, ad_group_id, COALESCE(keyword_id, 0), search_term)
);

CREATE INDEX IF NOT EXISTS idx_st_date  ON amazon_search_terms (date DESC);
CREATE INDEX IF NOT EXISTS idx_st_term  ON amazon_search_terms (search_term);

ALTER TABLE amazon_search_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_search_terms" ON amazon_search_terms;
CREATE POLICY "admin_read_search_terms" ON amazon_search_terms
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 7. Verification finale ───────────────────────────────────
SELECT 'amazon_credentials'    AS tbl, COUNT(*) AS rows FROM amazon_credentials
UNION ALL SELECT 'amazon_sync_state',         COUNT(*)      FROM amazon_sync_state
UNION ALL SELECT 'amazon_orders',             COUNT(*)      FROM amazon_orders
UNION ALL SELECT 'amazon_order_items',        COUNT(*)      FROM amazon_order_items
UNION ALL SELECT 'amazon_listings',           COUNT(*)      FROM amazon_listings
UNION ALL SELECT 'amazon_ads_keywords',       COUNT(*)      FROM amazon_ads_keywords
UNION ALL SELECT 'amazon_search_terms',       COUNT(*)      FROM amazon_search_terms;
