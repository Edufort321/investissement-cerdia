-- Migration 214 : Corrige « function is_super_admin() does not exist »
-- =====================================================================
-- BUG : les fonctions agrégées get_financial_summary() et get_nav_timeline()
-- (migrations 164/165) appellent is_super_admin() SANS argument dans leur
-- garde-fou tenant. Or la vraie fonction est is_super_admin(uid UUID) (mig.145).
--
-- Symptôme : en mode super-admin « View as » (un autre tenant que le sien, ex:
-- DEMO), la garde se déclenche, appelle is_super_admin() inexistante → EXCEPTION
-- 42883 → le tableau de bord affiche « Aucune donnée financière » et la carte NAV
-- disparaît. (Un vrai utilisateur du tenant n'entre jamais dans cette branche, donc
-- le bug ne touche QUE le super-admin en vue déléguée.)
--
-- CORRECTIF : créer une surcharge is_super_admin() sans argument qui délègue à
-- is_super_admin(auth.uid()). Non destructif, n'altère pas les fonctions complexes.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_super_admin(auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

COMMENT ON FUNCTION public.is_super_admin() IS
'Surcharge sans argument : délègue à is_super_admin(auth.uid()). Corrige les gardes des fonctions agrégées (mig.164/165) qui l''appelaient sans paramètre.';

-- Vérification : la fonction existe maintenant dans les deux signatures.
SELECT 'Migration 214 OK' AS resultat,
       (SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_super_admin') AS nb_signatures_is_super_admin;
