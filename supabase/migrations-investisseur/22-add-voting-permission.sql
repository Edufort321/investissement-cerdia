-- =====================================================
-- SCRIPT 22: PERMISSION DE VOTE POUR INVESTISSEURS
-- =====================================================
-- Description: Ajoute un champ can_vote pour gérer les permissions de vote
-- Dépendances: Script 2 (table investors), Script 20 (table scenarios)
-- =====================================================

-- Ajouter la colonne can_vote à la table investors
ALTER TABLE investors
ADD COLUMN IF NOT EXISTS can_vote BOOLEAN DEFAULT true;

-- Mettre à jour les investisseurs existants (tous ont le droit par défaut)
UPDATE investors
SET can_vote = true
WHERE can_vote IS NULL;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN investors.can_vote IS 'Permission de voter sur les scénarios d''évaluation';

-- Modifier la fonction de calcul du statut de vote pour ne compter que les investisseurs autorisés
-- Supprimer la vue qui dépend de la fonction
DROP VIEW IF EXISTS scenarios_with_votes;

-- Supprimer l'ancienne version de la fonction
DROP FUNCTION IF EXISTS get_scenario_vote_status(UUID);

-- Recréer avec les nouveaux paramètres de retour
CREATE FUNCTION get_scenario_vote_status(scenario_uuid UUID)
RETURNS TABLE(
  total_votes BIGINT,
  approve_votes BIGINT,
  reject_votes BIGINT,
  approval_percentage DECIMAL,
  is_approved BOOLEAN,
  total_eligible_voters BIGINT
) AS $$
DECLARE
  total_eligible BIGINT;
BEGIN
  -- Compter le nombre total d'investisseurs AUTORISÉS à voter
  SELECT COUNT(*) INTO total_eligible FROM investors WHERE can_vote = true;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_votes,
    COUNT(*) FILTER (WHERE vote = 'approve')::BIGINT as approve_votes,
    COUNT(*) FILTER (WHERE vote = 'reject')::BIGINT as reject_votes,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE vote = 'approve')::DECIMAL / COUNT(*)::DECIMAL * 100), 2)
      ELSE 0
    END as approval_percentage,
    -- Approuvé si majorité simple (> 50%) et au moins 2 votes
    CASE
      WHEN COUNT(*) >= 2 AND COUNT(*) FILTER (WHERE vote = 'approve') > COUNT(*) / 2 THEN TRUE
      ELSE FALSE
    END as is_approved,
    total_eligible::BIGINT as total_eligible_voters
  FROM scenario_votes sv
  INNER JOIN investors i ON sv.investor_id = i.id
  WHERE sv.scenario_id = scenario_uuid
  AND i.can_vote = true; -- Ne compter que les votes des investisseurs autorisés
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour la vue scenarios_with_votes pour inclure le nombre d'investisseurs éligibles
DROP VIEW IF EXISTS scenarios_with_votes;
CREATE OR REPLACE VIEW scenarios_with_votes AS
SELECT
  s.*,
  COALESCE(v.total_votes, 0) as total_votes,
  COALESCE(v.approve_votes, 0) as approve_votes,
  COALESCE(v.reject_votes, 0) as reject_votes,
  COALESCE(v.approval_percentage, 0) as approval_percentage,
  COALESCE(v.is_approved, false) as is_approved,
  COALESCE(v.total_eligible_voters, 0) as total_eligible_voters
FROM scenarios s
LEFT JOIN LATERAL get_scenario_vote_status(s.id) v ON true;

-- Ajouter une contrainte pour empêcher les investisseurs non autorisés de voter
-- Note: Ceci est une contrainte logique, la validation réelle se fait dans l'application
CREATE OR REPLACE FUNCTION check_investor_can_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'investisseur a le droit de voter
  IF NOT EXISTS (
    SELECT 1 FROM investors
    WHERE id = NEW.investor_id
    AND can_vote = true
  ) THEN
    RAISE EXCEPTION 'Cet investisseur n''a pas la permission de voter';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS check_voting_permission ON scenario_votes;
CREATE TRIGGER check_voting_permission
  BEFORE INSERT OR UPDATE ON scenario_votes
  FOR EACH ROW
  EXECUTE FUNCTION check_investor_can_vote();

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_investors_can_vote ON investors(can_vote);

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCRIPT 22: PERMISSION DE VOTE AJOUTÉE';
  RAISE NOTICE '';
  RAISE NOTICE 'Modifications apportées:';
  RAISE NOTICE '  - Colonne can_vote ajoutée à investors (default: true)';
  RAISE NOTICE '  - Fonction get_scenario_vote_status() mise à jour';
  RAISE NOTICE '  - Vue scenarios_with_votes mise à jour';
  RAISE NOTICE '  - Trigger de validation ajouté';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Tous les investisseurs existants ont le droit de vote par défaut';
  RAISE NOTICE '📌 Modifier dans l''interface: Administration → Investisseurs';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Index créé pour optimisation';
END $$;
