-- ============================================================
-- Migration 167 : Recrée scenarios_with_votes avec organization_id
--
-- La vue a été créée (migration 22) avant que la colonne organization_id
-- soit ajoutée à la table scenarios. PostgreSQL étend s.* une seule fois
-- à la création — les colonnes ajoutées après ne sont pas incluses.
-- Cette migration recrée la vue pour forcer l'expansion complète de s.*,
-- ce qui inclut maintenant organization_id (essentiel pour le filtre
-- tenant dans ScenariosTab.tsx).
-- ============================================================

-- DROP requis : CREATE OR REPLACE ne peut pas réordonner les colonnes existantes
-- lorsque s.* inclut de nouvelles colonnes ajoutées après la création initiale.
DROP VIEW IF EXISTS scenarios_with_votes CASCADE;

CREATE VIEW scenarios_with_votes
WITH (security_invoker = true)
AS
SELECT
  s.*,
  COALESCE(v.total_votes, 0)          AS total_votes,
  COALESCE(v.approve_votes, 0)        AS approve_votes,
  COALESCE(v.reject_votes, 0)         AS reject_votes,
  COALESCE(v.approval_percentage, 0)  AS approval_percentage,
  COALESCE(v.is_approved, false)      AS is_approved,
  COALESCE(v.total_eligible_voters, 0) AS total_eligible_voters
FROM scenarios s
LEFT JOIN LATERAL get_scenario_vote_status(s.id) v ON true;
