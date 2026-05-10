-- ============================================================
-- Migration 140 : schema complet de l'agent autonome Amazon
-- (cf. references/agent-schema.md + autonomy-levels.md du skill cerdia-commerce)
--
-- Tables :
--   - amazon_pending_actions      : queue d'approbation
--   - amazon_optimization_log     : audit trail immutable + rollback
--   - amazon_agent_settings       : config par regle (enabled, params)
--   - amazon_autonomy_policies    : politiques d'auto-execution (mode mixed)
--   - amazon_autonomy_executions  : compteur quotidien par politique
--   - amazon_agent_global_state   : kill switch global (paused/manual/mixed)
--
-- RPC : amazon_increment_autonomy_count (compteur atomique)
--
-- Vue : amazon_agent_activity (KPI par jour x action_type x status)
--
-- Pre-requis : migration 139 (profiles + roles) doit etre passee en premier.
-- Idempotent.
-- ============================================================

-- ── 1. amazon_pending_actions ────────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_pending_actions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    action_type     TEXT        NOT NULL CHECK (action_type IN (
        'update_bid','add_negative_keyword','pause_keyword',
        'update_price','update_listing_copy'
    )),

    entity_type     TEXT        NOT NULL,    -- keyword | campaign | listing | search_term
    entity_id       TEXT        NOT NULL,
    marketplace_id  TEXT        NOT NULL,

    before_value    JSONB       NOT NULL,
    after_value     JSONB       NOT NULL,

    rule_name       TEXT        NOT NULL,
    reason          TEXT        NOT NULL,
    confidence      TEXT        NOT NULL CHECK (confidence IN ('high','medium','low')),

    estimated_impact JSONB,

    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','applied','failed','rejected','expired')),

    dedupe_key      TEXT        NOT NULL,

    proposed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at     TIMESTAMPTZ,
    approved_by     UUID        REFERENCES auth.users(id),
    rejected_at     TIMESTAMPTZ,
    rejected_by     UUID        REFERENCES auth.users(id),
    applied_at      TIMESTAMPTZ,
    failure_reason  TEXT,
    amazon_response JSONB
);

-- Une proposition vivante (pending/approved) doit etre unique par dedupe_key
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_actions_dedupe_alive
    ON amazon_pending_actions (dedupe_key)
    WHERE status IN ('pending','approved');

CREATE INDEX IF NOT EXISTS idx_pending_status        ON amazon_pending_actions (status, proposed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_entity        ON amazon_pending_actions (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pending_action_type   ON amazon_pending_actions (action_type, status);
CREATE INDEX IF NOT EXISTS idx_pending_marketplace   ON amazon_pending_actions (marketplace_id);

ALTER TABLE amazon_pending_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_pending"   ON amazon_pending_actions;
DROP POLICY IF EXISTS "admin_update_pending" ON amazon_pending_actions;

CREATE POLICY "admin_read_pending" ON amazon_pending_actions
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );

CREATE POLICY "admin_update_pending" ON amazon_pending_actions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );
-- Pas de policies INSERT/DELETE pour authenticated : seul service_role ecrit.


-- ── 2. amazon_optimization_log ───────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_optimization_log (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    change_type          TEXT        NOT NULL,
    entity_type          TEXT        NOT NULL,
    entity_id            TEXT        NOT NULL,

    before_value         JSONB,
    after_value          JSONB,

    rule_name            TEXT,
    reason               TEXT,
    triggered_by         TEXT        NOT NULL,    -- 'manual:<user_id>' | 'chat:<user_id>' | 'autonomous:<policy_id>'

    pending_action_id    UUID        REFERENCES amazon_pending_actions(id),
    amazon_response      JSONB,

    rolled_back_at       TIMESTAMPTZ,
    rolled_back_by       TEXT,
    rolled_back_response JSONB
);

CREATE INDEX IF NOT EXISTS idx_oplog_occurred  ON amazon_optimization_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_oplog_entity    ON amazon_optimization_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_oplog_active    ON amazon_optimization_log (rolled_back_at) WHERE rolled_back_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oplog_triggered ON amazon_optimization_log (triggered_by);

ALTER TABLE amazon_optimization_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_oplog" ON amazon_optimization_log;
CREATE POLICY "admin_read_oplog" ON amazon_optimization_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 3. amazon_agent_settings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_agent_settings (
    rule_name    TEXT        PRIMARY KEY,
    enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
    params       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    description  TEXT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by   UUID        REFERENCES auth.users(id)
);

ALTER TABLE amazon_agent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_rw_settings" ON amazon_agent_settings;
CREATE POLICY "admin_rw_settings" ON amazon_agent_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );

-- Seed : 5 regles standard, toutes desactivees par defaut
INSERT INTO amazon_agent_settings (rule_name, enabled, params, description) VALUES
    ('bid_bleeder',     FALSE, '{"min_clicks":15,"lookback_days":30,"bid_multiplier":0.5}',
     'Reduit les bids des keywords avec >=15 clics et 0 conversion sur 30j'),
    ('bid_high_acos',   FALSE, '{"min_clicks":10,"acos_multiplier":2.0,"bid_multiplier":0.75}',
     'Reduit les bids des keywords avec ACoS > 2x target'),
    ('bid_winner',      FALSE, '{"min_orders":3,"min_clicks":10,"bid_multiplier":1.15}',
     'Augmente les bids des keywords profitables'),
    ('negative_harvest',FALSE, '{"min_clicks":8,"lookback_days":14,"max_per_run":50}',
     'Propose des mots-cles negatifs pour search terms qui drainent du budget'),
    ('price_adjust',    FALSE, '{"max_change_pct":5,"min_orders_total":30,"respect_map":true}',
     'Ajuste les prix des listings selon Buy Box, stock, et marge')
ON CONFLICT (rule_name) DO NOTHING;


-- ── 4. amazon_agent_global_state (kill switch) ──────────────
-- Singleton : id=1 toujours. Stocke le mode global de l'agent.
CREATE TABLE IF NOT EXISTS amazon_agent_global_state (
    id          INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    global_mode TEXT        NOT NULL DEFAULT 'manual'
                            CHECK (global_mode IN ('paused','manual','mixed')),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID        REFERENCES auth.users(id)
);

INSERT INTO amazon_agent_global_state (id, global_mode)
VALUES (1, 'manual')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE amazon_agent_global_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_rw_global_state" ON amazon_agent_global_state;
CREATE POLICY "admin_rw_global_state" ON amazon_agent_global_state
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 5. amazon_autonomy_policies ──────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_autonomy_policies (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT        NOT NULL,

    -- Conditions de match (toutes doivent etre vraies)
    rule_name           TEXT        NOT NULL,    -- ex: 'bid_bleeder' | '*' pour wildcard
    action_type         TEXT,                    -- optionnel
    min_confidence      TEXT        CHECK (min_confidence IN ('high','medium','low') OR min_confidence IS NULL),
    max_impact_cents    INTEGER,
    marketplace_id      TEXT,

    -- Plages horaires (UTC)
    active_hours_start  TIME,
    active_hours_end    TIME,

    -- Etat
    enabled             BOOLEAN     NOT NULL DEFAULT FALSE,
    daily_action_cap    INTEGER,                 -- NULL = pas de cap

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID        REFERENCES auth.users(id),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomy_enabled ON amazon_autonomy_policies (enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_autonomy_rule    ON amazon_autonomy_policies (rule_name);

ALTER TABLE amazon_autonomy_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_rw_policies" ON amazon_autonomy_policies;
CREATE POLICY "admin_rw_policies" ON amazon_autonomy_policies
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );

-- Seed : 3 politiques d'exemple, desactivees par defaut
INSERT INTO amazon_autonomy_policies (name, rule_name, min_confidence, max_impact_cents, daily_action_cap, enabled) VALUES
    ('Auto bid_bleeder safe',      'bid_bleeder',      'high', 500,  20, FALSE),
    ('Auto negative_harvest',      'negative_harvest', 'high', NULL, 30, FALSE),
    ('Auto bid_high_acos light',   'bid_high_acos',    'high', 1000, 15, FALSE)
ON CONFLICT DO NOTHING;


-- ── 6. amazon_autonomy_executions (compteur quotidien) ──────
CREATE TABLE IF NOT EXISTS amazon_autonomy_executions (
    policy_id       UUID    REFERENCES amazon_autonomy_policies(id) ON DELETE CASCADE,
    execution_date  DATE    NOT NULL,
    count           INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (policy_id, execution_date)
);

ALTER TABLE amazon_autonomy_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_executions" ON amazon_autonomy_executions;
CREATE POLICY "admin_read_executions" ON amazon_autonomy_executions
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
    );


-- ── 7. RPC : increment atomique du compteur ──────────────────
CREATE OR REPLACE FUNCTION amazon_increment_autonomy_count(p_policy_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO amazon_autonomy_executions (policy_id, execution_date, count)
    VALUES (p_policy_id, CURRENT_DATE, 1)
    ON CONFLICT (policy_id, execution_date)
    DO UPDATE SET count = amazon_autonomy_executions.count + 1;
END;
$$;


-- ── 8. Vue d'activite agent (KPI 30 derniers jours) ─────────
CREATE OR REPLACE VIEW amazon_agent_activity AS
SELECT
    DATE_TRUNC('day', proposed_at)::date AS day,
    action_type,
    status,
    COUNT(*) AS count,
    SUM(COALESCE((estimated_impact->>'delta_cents_per_month')::int, 0)) AS estimated_impact_cents
FROM amazon_pending_actions
WHERE proposed_at >= NOW() - INTERVAL '30 days'
GROUP BY day, action_type, status
ORDER BY day DESC, action_type;


-- ── 9. Comments ──────────────────────────────────────────────
COMMENT ON TABLE  amazon_pending_actions     IS 'Queue d''approbation des actions PPC/pricing proposees par l''agent';
COMMENT ON TABLE  amazon_optimization_log    IS 'Audit trail immutable de tout ce qui a ete applique sur Amazon (rollback)';
COMMENT ON TABLE  amazon_agent_settings      IS 'Config par regle (enabled + params)';
COMMENT ON TABLE  amazon_autonomy_policies   IS 'Politiques d''auto-execution (mode mixed)';
COMMENT ON TABLE  amazon_autonomy_executions IS 'Compteur quotidien des actions auto par politique (respect du daily_action_cap)';
COMMENT ON TABLE  amazon_agent_global_state  IS 'Kill switch global : paused/manual/mixed (singleton id=1)';
COMMENT ON COLUMN amazon_pending_actions.dedupe_key   IS 'Cle d''idempotence : ex update_bid:kw_12345:2026-W19';
COMMENT ON COLUMN amazon_optimization_log.triggered_by IS 'manual:<user_id> | chat:<user_id> | autonomous:<policy_id>';


-- ── 10. Verification finale ──────────────────────────────────
SELECT 'amazon_pending_actions'      AS tbl, COUNT(*) AS rows FROM amazon_pending_actions
UNION ALL SELECT 'amazon_optimization_log',     COUNT(*)      FROM amazon_optimization_log
UNION ALL SELECT 'amazon_agent_settings',       COUNT(*)      FROM amazon_agent_settings
UNION ALL SELECT 'amazon_autonomy_policies',    COUNT(*)      FROM amazon_autonomy_policies
UNION ALL SELECT 'amazon_autonomy_executions',  COUNT(*)      FROM amazon_autonomy_executions
UNION ALL SELECT 'amazon_agent_global_state',   COUNT(*)      FROM amazon_agent_global_state;
