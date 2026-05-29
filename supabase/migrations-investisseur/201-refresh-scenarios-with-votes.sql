-- Migration 201 : Recréer scenarios_with_votes après ajout property_type (migration 197)
-- PostgreSQL ne met pas à jour automatiquement s.* dans une vue après ALTER TABLE ADD COLUMN.
-- Cette migration force la recréation de la vue pour inclure toutes les colonnes actuelles.
-- Exécuter dans le SQL Editor de Supabase Dashboard (CERDIA)

DROP VIEW IF EXISTS scenarios_with_votes CASCADE;

CREATE VIEW scenarios_with_votes
WITH (security_invoker = true)
AS
SELECT
  s.*,
  COALESCE(v.total_votes, 0)           AS total_votes,
  COALESCE(v.approve_votes, 0)         AS approve_votes,
  COALESCE(v.reject_votes, 0)          AS reject_votes,
  COALESCE(v.approval_percentage, 0)   AS approval_percentage,
  COALESCE(v.is_approved, false)       AS is_approved,
  COALESCE(v.total_eligible_voters, 0) AS total_eligible_voters
FROM scenarios s
LEFT JOIN LATERAL get_scenario_vote_status(s.id) v ON true;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 201 OK';
  RAISE NOTICE '   scenarios_with_votes recréée — inclut property_type (migration 197)';
END $$;
