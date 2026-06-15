-- 222 : CORRECTIF du 500 « création d'admin commerce » (POST /api/commerce/csecur360/admins).
--
-- CAUSE RACINE : l'upsert profiles(role='org_commerce', …) violait profiles_role_check, qui était
-- resté la version ÉTROITE de la migration 139 ('owner','admin','investor','viewer'). La 221 censée
-- l'élargir avait été ROLLBACK en entier parce qu'elle insérait aussi une org avec plan='partner'
-- (invalide pour organizations.plan CHECK) — OU parce que la table `organizations` n'existe même pas
-- dans ce projet (migration 145 multi-tenant jamais appliquée ici). Comme `organizations` est absente,
-- il n'y a AUCUNE FK sur profiles.organization_id : c'est un simple UUID libre, l'org dédiée n'est donc
-- pas nécessaire pour débloquer la création d'admin.
--
-- Cette migration : (1) élargit profiles_role_check (NOT VALID) — c'est CE QUI DÉBLOQUE le 500 ;
-- (2) crée l'org dédiée C-Secur360 avec un plan VALIDE *uniquement si* la table organizations existe.
-- 100 % idempotente, sûre que la table organizations existe ou non.

-- (1) Élargir profiles_role_check. NOT VALID : ne valide PAS les lignes existantes (certaines ont
--     'system'/'user'/'org_investor'…), mais impose la contrainte aux NOUVELLES écritures -> la route
--     peut enfin poser 'org_commerce'.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'owner','admin','investor','viewer','member',
    'org_owner','org_admin','org_commerce','org_investor','org_user','org_viewer',
    'super_admin','system','user'
  )) NOT VALID;

-- (2) Org dédiée C-Secur360 (commerce SEULEMENT, isolée de CERDIA Globale) — SEULEMENT si la table
--     organizations existe (sinon on saute : aucune FK ne dépend de cette org).
DO $$
BEGIN
  IF to_regclass('public.organizations') IS NOT NULL THEN
    INSERT INTO organizations (id, name, slug, plan, status, settings)
    VALUES (
      'c5ec0360-0000-0000-0000-000000000001'::uuid,
      'C-Secur360',
      'c-secur360',
      'enterprise',  -- valeur VALIDE (la 221 utilisait 'partner' -> rejet du CHECK organizations.plan)
      'active',
      jsonb_build_object(
        'currency_primary', 'CAD',
        'tax_jurisdiction', 'CA',
        'modules', jsonb_build_object('investment', false, 'commerce', true)
      )
    )
    ON CONFLICT (id) DO UPDATE
      SET plan = EXCLUDED.plan, status = EXCLUDED.status, settings = EXCLUDED.settings;
  END IF;
END $$;

insert into schema_migrations (version) values ('222') on conflict (version) do nothing;
NOTIFY pgrst, 'reload schema';
