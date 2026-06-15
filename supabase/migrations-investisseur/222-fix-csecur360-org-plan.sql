-- 222 : CORRECTIF du pont commerce C-Secur (la 221 échouait silencieusement).
-- CAUSE : la 221 insérait l'organisation « C-Secur360 » avec plan='partner', VALEUR INVALIDE pour la
-- contrainte organizations.plan CHECK (basic|pro|enterprise|demo|internal). L'INSERT échouait -> ROLLBACK
-- de TOUTE la 221 -> (a) l'org C-Secur360 n'était jamais créée, (b) profiles_role_check n'était jamais
-- élargi. Résultat : la route /api/commerce/csecur360/admins faisait un upsert profiles
-- (role='org_commerce', organization_id=C-Secur360) qui violait soit le CHECK de rôle soit la FK
-- organization_id -> HTTP 500 -> impossible de créer un admin commerce (ex. Benjamin Roussel).
-- Cette migration RÉ-APPLIQUE les deux correctifs avec un plan VALIDE ('enterprise'). 100 % idempotente.

-- (1) Élargir profiles_role_check (NOT VALID : n'échoue pas sur les lignes existantes, valide les nouvelles).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'owner','admin','investor','viewer','member',
    'org_owner','org_admin','org_commerce','org_investor','org_user','org_viewer',
    'super_admin','system','user'
  )) NOT VALID;

-- (2) Organisation DÉDIÉE « C-Secur360 » (commerce SEULEMENT, ISOLÉE de CERDIA Globale), plan VALIDE.
INSERT INTO organizations (id, name, slug, plan, status, settings)
VALUES (
  'c5ec0360-0000-0000-0000-000000000001'::uuid,
  'C-Secur360',
  'c-secur360',
  'enterprise',           -- valeur VALIDE (la 221 utilisait 'partner' -> rejet du CHECK)
  'active',
  jsonb_build_object(
    'currency_primary', 'CAD',
    'tax_jurisdiction', 'CA',
    -- Commerce SEULEMENT : pas d'investissement -> aucun accès à la zone/aux données investisseur de Globale.
    'modules', jsonb_build_object('investment', false, 'commerce', true)
  )
)
ON CONFLICT (id) DO UPDATE
  SET plan = EXCLUDED.plan, status = EXCLUDED.status, settings = EXCLUDED.settings;

insert into schema_migrations (version) values ('222') on conflict (version) do nothing;
NOTIFY pgrst, 'reload schema';
