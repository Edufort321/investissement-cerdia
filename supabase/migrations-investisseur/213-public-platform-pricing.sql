-- Migration 213 : Prix d'abonnement plateforme exposé publiquement (page d'accueil)
-- =====================================================================
-- La page d'accueil publique doit afficher le prix annuel de la plateforme
-- (stocké dans organizations.settings.saas_pricing de CERDIA Globale).
-- Or anon ne peut PAS lire la table organizations (et il ne DOIT pas — ça
-- exposerait tous les settings). On expose donc UNIQUEMENT le prix via une vue
-- dédiée, en lecture publique, sans rien d'autre.
-- =====================================================================

CREATE OR REPLACE VIEW public.platform_public_pricing AS
SELECT
  (settings -> 'saas_pricing' ->> 'annual_amount_cad')::numeric AS annual_amount_cad,
  COALESCE(settings -> 'saas_pricing' ->> 'currency', 'CAD')     AS currency
FROM organizations
WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid
  AND (settings -> 'saas_pricing' ->> 'annual_amount_cad') IS NOT NULL;

-- La vue est en SECURITY DEFINER implicite (vue normale = droits du créateur).
-- On accorde la lecture à anon + authenticated. Aucune autre colonne n'est exposée.
GRANT SELECT ON public.platform_public_pricing TO anon, authenticated;

COMMENT ON VIEW public.platform_public_pricing IS
'Prix d''abonnement annuel de la plateforme, exposé publiquement pour la page d''accueil. N''expose QUE le montant et la devise.';

SELECT 'Migration 213 OK — vue platform_public_pricing créée' AS resultat,
       (SELECT annual_amount_cad FROM platform_public_pricing) AS prix_actuel;
