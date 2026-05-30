-- Migration 210 : Durcissement RLS accès ANONYME (avant exposition web publique)
-- =====================================================================
-- Ferme 2 expositions anonymes confirmées :
--
-- FAILLE A — accountant_tokens lisible par anon SANS filtre (mig.194) :
--   Policy `anon_read_accountant_tokens USING (expires_at > NOW())` permettait
--   `SELECT * FROM accountant_tokens` à TOUT anonyme → fuite de TOUS les tokens
--   actifs de TOUS les tenants (donc accès aux données comptables).
--   + policy `auth_manage USING(true)` sans filtre org.
--   CORRECTIF : la validation d'un token passe désormais UNIQUEMENT par la route
--   serveur /api/accountant-token?token=... (service_role, match exact). On RÉVOQUE
--   l'accès anon direct à la table.
--
-- FAILLE B — portfolio_profiles : policies anon `USING(true)` (mig.174/183) →
--   un anonyme pouvait lire/modifier TOUS les profils artistiques (données perso).
--   CORRECTIF intermédiaire : on retire l'accès en LECTURE anon massif. L'accès via
--   lien de remplissage doit passer par une RPC SECURITY DEFINER prenant le token
--   (à implémenter — voir TODO). L'UPDATE anon est restreint aux lignes possédant
--   un fill_token (réduit la surface ; le filtrage fin par token reste à faire RPC).
-- =====================================================================

-- ── FAILLE A : couper l'accès anon à accountant_tokens ───────────────────
DROP POLICY IF EXISTS "anon_read_accountant_tokens" ON accountant_tokens;

-- Remplace la policy authenticated USING(true) par un filtre tenant strict.
DROP POLICY IF EXISTS "auth_manage_accountant_tokens" ON accountant_tokens;
CREATE POLICY "auth_manage_accountant_tokens" ON accountant_tokens
  FOR ALL TO authenticated
  USING (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (organization_id = public.auth_get_org_id() OR public.is_super_admin(auth.uid()));

REVOKE SELECT ON TABLE accountant_tokens FROM anon;

-- ── FAILLE B : restreindre l'accès anon au portfolio ─────────────────────
-- Lecture anon : seulement les profils PUBLIÉS (la page publique /portfolio/[slug]
-- en a besoin). Le remplissage par lien (fill_token) devra passer par une RPC.
DROP POLICY IF EXISTS "portfolio_fill_token_read" ON portfolio_profiles;
CREATE POLICY "portfolio_public_read_published" ON portfolio_profiles
  FOR SELECT TO anon
  USING (COALESCE(is_published, false) = true);

-- Écriture anon : restreinte aux profils qui ont un fill_token défini (réduit la
-- surface ; le filtrage exact par valeur de token reste à faire via RPC dédiée).
DROP POLICY IF EXISTS "portfolio_fill_token_update" ON portfolio_profiles;
CREATE POLICY "portfolio_fill_token_update" ON portfolio_profiles
  FOR UPDATE TO anon
  USING (fill_token IS NOT NULL)
  WITH CHECK (fill_token IS NOT NULL);

-- ── Vérification ─────────────────────────────────────────────────────────
SELECT
  tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('accountant_tokens','portfolio_profiles')
ORDER BY tablename, policyname;
