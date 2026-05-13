-- ============================================================
-- Migration 152 : Multi-Tenant — fix fuites via views et helpers
--
-- Bug critique decouvert le 2026-05-13 : un nouveau tenant (sans data)
-- voit le NAV/Part et la valeur totale de CERDIA Globale dans le
-- dashboard, alors qu'il devrait voir zero.
--
-- Causes :
--   1. get_setting(key) — helper de mig 19 qui SELECT depuis
--      company_settings sans filtrer par organization_id.
--   2. share_settings — vue qui consomme get_setting() → leak.
--   3. investor_summary — vue qui (par defaut) tourne avec les
--      privileges du OWNER (postgres superuser), donc bypass RLS.
--
-- Fix :
--   A. get_setting() devient tenant-aware (filtre par auth_get_org_id).
--   B. share_settings reste mais utilise le get_setting() corrige.
--   C. investor_summary recreee avec security_invoker = true (Postgres
--      15+) pour que la vue respecte la RLS du user appelant.
-- ============================================================

BEGIN;


-- ── A. get_setting() tenant-aware ────────────────────────────
-- Filtre par organization_id du user authentifie. Retourne NULL si
-- pas de setting pour cette org (les fallbacks cote app prennent
-- le relais — ex: nominal_share_value ?? 1).
CREATE OR REPLACE FUNCTION public.get_setting(key_name VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
    result TEXT;
    org_id UUID;
BEGIN
    org_id := public.auth_get_org_id();
    -- Si aucun org dans le contexte (anonyme, ou super_admin), on
    -- retourne le setting de CERDIA Globale par defaut.
    IF org_id IS NULL THEN
        org_id := 'c0000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    SELECT setting_value INTO result
    FROM public.company_settings
    WHERE setting_key = key_name
      AND organization_id = org_id
    LIMIT 1;

    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_setting(VARCHAR) IS
'Helper de lecture des settings, tenant-aware via auth_get_org_id(). Fallback : CERDIA Globale si aucun org_id dans le contexte (super_admin sans override, ou anonyme).';


-- ── B. update_setting() tenant-aware ─────────────────────────
-- Meme idee : UPDATE filtre par org_id du user authentifie.
CREATE OR REPLACE FUNCTION public.update_setting(key_name VARCHAR, new_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    org_id UUID;
BEGIN
    org_id := public.auth_get_org_id();
    IF org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    UPDATE public.company_settings
       SET setting_value = new_value,
           updated_at = NOW()
     WHERE setting_key = key_name
       AND organization_id = org_id;
    RETURN FOUND;
END;
$$;


-- ── C. share_settings view (recreation defensive) ────────────
-- La vue elle-meme ne change pas — elle consomme get_setting()
-- qui est maintenant tenant-aware. Mais on la recree avec
-- security_invoker pour eviter tout bypass futur.
DROP VIEW IF EXISTS public.share_settings;
CREATE VIEW public.share_settings
WITH (security_invoker = true)
AS
SELECT
    get_setting('nominal_share_value')::DECIMAL(10, 4)        AS nominal_share_value,
    get_setting('estimated_share_value')::DECIMAL(10, 4)      AS estimated_share_value,
    get_setting('company_name')                               AS company_name,
    get_setting('share_calculation_method')                   AS calculation_method,
    get_setting('last_share_value_calculation')::TIMESTAMP    AS last_calculation_date;


-- ── D. investor_summary view avec security_invoker ───────────
-- Recreation a l'identique mais avec security_invoker = true,
-- pour que la vue respecte la RLS du user appelant (tenant_isolation
-- sur investor_investments et investors).
DROP VIEW IF EXISTS public.investor_summary;
CREATE VIEW public.investor_summary
WITH (security_invoker = true)
AS
SELECT
    i.id                                                            AS investor_id,
    CONCAT(i.first_name, ' ', i.last_name)                          AS investor_name,
    i.email,
    COUNT(ii.id)                                                    AS total_investments,
    COALESCE(SUM(ii.amount_invested), 0)                            AS total_amount_invested,
    COALESCE(SUM(ii.number_of_shares), 0)                           AS total_shares,
    COALESCE(AVG(ii.share_price_at_purchase), 0)                    AS average_purchase_price,
    MIN(ii.investment_date)                                         AS first_investment_date,
    MAX(ii.investment_date)                                         AS last_investment_date
FROM public.investors i
LEFT JOIN public.investor_investments ii ON i.id = ii.investor_id
GROUP BY i.id, i.first_name, i.last_name, i.email;

COMMENT ON VIEW public.investor_summary IS
'Resume par investisseur — recree en mig 152 avec security_invoker pour respecter la RLS tenant_isolation du user appelant.';


-- ── E. Verification ──────────────────────────────────────────
-- Doit montrer que get_setting() est tenant-aware.
SELECT 'get_setting tenant-aware' AS check_name,
       CASE WHEN prosecdef = false AND provolatile = 's'
            THEN '✅ SECURITY INVOKER + STABLE'
            ELSE '⚠️ check function definition'
       END AS status
FROM pg_proc
WHERE proname = 'get_setting' AND pronamespace = 'public'::regnamespace
LIMIT 1;

-- Doit retourner 'true' pour les 2 vues
SELECT 'view security_invoker' AS check_name,
       schemaname || '.' || viewname AS view_name,
       reloptions::TEXT AS options
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
WHERE schemaname = 'public'
  AND viewname IN ('share_settings', 'investor_summary');


COMMIT;
