-- ============================================================
-- Migration 142 : fix recursion infinie dans les RLS de profiles
--
-- La migration 139 a cree une policy admin_rw_profiles qui fait un
-- SELECT sur profiles dans sa condition USING → recursion infinie
-- (PostgreSQL renvoie 500 Internal Server Error a chaque query sur
-- profiles depuis un user authentifie).
--
-- Fix : helper function SECURITY DEFINER qui bypass les RLS pour
-- evaluer le role sans recursion. Toutes les policies admin
-- referencant profiles utilisent maintenant cette fonction.
-- ============================================================

-- ── 1. Helper SECURITY DEFINER (bypass RLS dans la fonction) ─
CREATE OR REPLACE FUNCTION public.is_cerdia_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
         WHERE id = uid
           AND role IN ('owner', 'admin')
    )
$$;

GRANT EXECUTE ON FUNCTION public.is_cerdia_admin(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_cerdia_admin(UUID) IS
'Helper SECURITY DEFINER qui retourne true si le user a role owner/admin dans profiles. Utilise dans les RLS policies pour eviter la recursion.';


-- ── 2. Refaire les policies de profiles ─────────────────────
DROP POLICY IF EXISTS "admin_rw_profiles" ON profiles;

CREATE POLICY "admin_rw_profiles" ON profiles
    FOR ALL TO authenticated
    USING (public.is_cerdia_admin(auth.uid()))
    WITH CHECK (public.is_cerdia_admin(auth.uid()));

-- self_read_profile et self_update_profile restent inchangees
-- (elles ne font pas de query sur profiles, donc pas de recursion).


-- ── 3. Refaire les policies de l'agent (mig 140) ────────────
-- Elles ne provoquent pas de recursion directe (SELECT sur profiles
-- depuis amazon_pending_actions par ex), mais l'evaluation de la
-- policy de profiles DECLENCHEE par ce SELECT plantait. Maintenant
-- avec la fonction, plus de plantage.

DROP POLICY IF EXISTS "admin_read_pending"   ON amazon_pending_actions;
DROP POLICY IF EXISTS "admin_update_pending" ON amazon_pending_actions;
CREATE POLICY "admin_read_pending"   ON amazon_pending_actions
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));
CREATE POLICY "admin_update_pending" ON amazon_pending_actions
    FOR UPDATE TO authenticated USING (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_oplog" ON amazon_optimization_log;
CREATE POLICY "admin_read_oplog" ON amazon_optimization_log
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_rw_settings" ON amazon_agent_settings;
CREATE POLICY "admin_rw_settings" ON amazon_agent_settings
    FOR ALL TO authenticated
    USING (public.is_cerdia_admin(auth.uid()))
    WITH CHECK (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_rw_global_state" ON amazon_agent_global_state;
CREATE POLICY "admin_rw_global_state" ON amazon_agent_global_state
    FOR ALL TO authenticated
    USING (public.is_cerdia_admin(auth.uid()))
    WITH CHECK (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_rw_policies" ON amazon_autonomy_policies;
CREATE POLICY "admin_rw_policies" ON amazon_autonomy_policies
    FOR ALL TO authenticated
    USING (public.is_cerdia_admin(auth.uid()))
    WITH CHECK (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_executions" ON amazon_autonomy_executions;
CREATE POLICY "admin_read_executions" ON amazon_autonomy_executions
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));


-- ── 4. Refaire les policies des sources Amazon (mig 141) ────
DROP POLICY IF EXISTS "admin_read_sync_state" ON amazon_sync_state;
CREATE POLICY "admin_read_sync_state" ON amazon_sync_state
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_orders" ON amazon_orders;
CREATE POLICY "admin_read_orders" ON amazon_orders
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_order_items" ON amazon_order_items;
CREATE POLICY "admin_read_order_items" ON amazon_order_items
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_rw_listings" ON amazon_listings;
CREATE POLICY "admin_rw_listings" ON amazon_listings
    FOR ALL TO authenticated
    USING (public.is_cerdia_admin(auth.uid()))
    WITH CHECK (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_keywords" ON amazon_ads_keywords;
CREATE POLICY "admin_read_keywords" ON amazon_ads_keywords
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_read_search_terms" ON amazon_search_terms;
CREATE POLICY "admin_read_search_terms" ON amazon_search_terms
    FOR SELECT TO authenticated USING (public.is_cerdia_admin(auth.uid()));


-- ── 5. Verification ──────────────────────────────────────────
-- Doit retourner 'true' pour Eric (owner)
SELECT
    'Eric is admin' AS test,
    public.is_cerdia_admin(
        (SELECT id FROM auth.users WHERE email = 'eric.dufort@cerdia.ai' LIMIT 1)
    ) AS result;
