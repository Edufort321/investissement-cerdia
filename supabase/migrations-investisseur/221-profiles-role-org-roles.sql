-- 221 : Pont admins commerce C-Secur — correctif complet.
-- (1) BUG 500 : profiles.role n'autorisait que ('owner','admin','investor','viewer') (mig 139) alors
--     que la route /api/commerce/csecur360/admins pose 'org_commerce' (et org_admin/super_admin/org_viewer)
--     -> violation profiles_role_check -> 500 -> compte admin commerce (ex. Benjamin Roussel) jamais créé
--     -> connexion impossible (auth/v1/token 400). On élargit la contrainte.
-- (2) ISOLATION : on crée une ORGANISATION DÉDIÉE « C-Secur360 » (commerce SEULEMENT) pour que les
--     admins commerce C-Secur soient ISOLÉS (RLS) de « CERDIA Globale » (autre compagnie ; son auth
--     investisseur vient de la zone client). La route rattachera les admins commerce à CETTE org.
-- Idempotent.

-- Liste COMPLÈTE des rôles réellement utilisés (legacy investisseur + multitenant org + system/user).
-- NOT VALID : n'échoue PAS sur les lignes existantes (certaines ont 'system'/'user'/'org_investor'…),
-- tout en validant les NOUVELLES écritures -> la route /admins peut poser 'org_commerce'.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'owner','admin','investor','viewer','member',
    'org_owner','org_admin','org_commerce','org_investor','org_user','org_viewer',
    'super_admin','system','user'
  )) NOT VALID;

-- Org dédiée C-Secur360 — SEULEMENT si la table organizations existe (mig 145 multi-tenant pas
-- appliquée sur tous les projets ; sans elle, aucune FK sur profiles.organization_id, l'org n'est pas
-- requise). plan='enterprise' (était 'partner', invalide pour le CHECK organizations.plan). Voir mig 222.
DO $$
BEGIN
  IF to_regclass('public.organizations') IS NOT NULL THEN
    INSERT INTO organizations (id, name, slug, plan, status, settings)
    VALUES (
      'c5ec0360-0000-0000-0000-000000000001'::uuid,
      'C-Secur360', 'c-secur360', 'enterprise', 'active',
      jsonb_build_object('currency_primary', 'CAD', 'tax_jurisdiction', 'CA',
        'modules', jsonb_build_object('investment', false, 'commerce', true))
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

insert into schema_migrations (version) values ('221') on conflict (version) do nothing;
NOTIFY pgrst, 'reload schema';
