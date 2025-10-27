-- =====================================================
-- SCRIPT 43: AJOUT DU STATUT "PENDING_TRANSFER"
--
-- Ce script ajoute le nouveau statut "pending_transfer" (en attente
-- de transfert) et automatise le changement de statut quand la
-- majorité des investisseurs ont voté.
--
-- Changements:
-- 1. Modifier la contrainte status pour accepter 'pending_transfer'
-- 2. Créer un trigger pour auto-changer le statut après chaque vote
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- Étape 1: Modifier la contrainte CHECK pour accepter 'pending_transfer'
DO $$
BEGIN
    -- Supprimer l'ancienne contrainte
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'scenarios'::regclass
          AND conname = 'scenarios_status_check'
    ) THEN
        ALTER TABLE scenarios DROP CONSTRAINT scenarios_status_check;
        RAISE NOTICE 'Ancienne contrainte status supprimée';
    END IF;

    -- Créer la nouvelle contrainte avec pending_transfer
    ALTER TABLE scenarios
    ADD CONSTRAINT scenarios_status_check
    CHECK (status IN ('draft', 'pending_vote', 'pending_transfer', 'approved', 'rejected', 'purchased'));

    RAISE NOTICE '✅ Contrainte status mise à jour avec pending_transfer';
END $$;

-- Étape 2: Fonction pour vérifier et mettre à jour le statut après un vote
CREATE OR REPLACE FUNCTION update_scenario_status_after_vote()
RETURNS TRIGGER AS $$
DECLARE
    vote_stats RECORD;
    total_eligible INTEGER;
BEGIN
    -- Récupérer les stats de vote pour ce scénario
    SELECT
        COUNT(*) as total_votes,
        COUNT(*) FILTER (WHERE vote = 'approve') as approve_votes,
        COUNT(*) FILTER (WHERE vote = 'reject') as reject_votes
    INTO vote_stats
    FROM scenario_votes
    WHERE scenario_id = NEW.scenario_id;

    -- Compter le nombre total d'investisseurs éligibles (can_vote = true)
    SELECT COUNT(*) INTO total_eligible
    FROM investors
    WHERE can_vote = true;

    -- Si personne n'est éligible, ne rien faire
    IF total_eligible = 0 THEN
        RETURN NEW;
    END IF;

    -- Calculer si la majorité a été atteinte (> 50% des éligibles)
    IF vote_stats.total_votes > (total_eligible / 2.0) THEN
        -- La majorité a voté, vérifier le résultat
        IF vote_stats.approve_votes > vote_stats.reject_votes THEN
            -- Majorité approuve → pending_transfer
            UPDATE scenarios
            SET status = 'pending_transfer'
            WHERE id = NEW.scenario_id
              AND status = 'pending_vote';

            RAISE NOTICE '✅ Scénario % changé à pending_transfer (% votes pour, % contre)',
                NEW.scenario_id, vote_stats.approve_votes, vote_stats.reject_votes;
        ELSIF vote_stats.reject_votes > vote_stats.approve_votes THEN
            -- Majorité rejette → rejected
            UPDATE scenarios
            SET status = 'rejected'
            WHERE id = NEW.scenario_id
              AND status = 'pending_vote';

            RAISE NOTICE '❌ Scénario % rejeté (% votes pour, % contre)',
                NEW.scenario_id, vote_stats.approve_votes, vote_stats.reject_votes;
        END IF;
        -- Si égalité, on laisse en pending_vote
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Étape 3: Créer le trigger sur scenario_votes
DROP TRIGGER IF EXISTS trigger_update_scenario_status ON scenario_votes;

CREATE TRIGGER trigger_update_scenario_status
    AFTER INSERT OR UPDATE ON scenario_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_scenario_status_after_vote();

-- Vérification finale
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conrelid = 'scenarios'::regclass
      AND conname = 'scenarios_status_check';

    RAISE NOTICE 'Contrainte créée: %', constraint_def;
    RAISE NOTICE '✅ Trigger créé sur scenario_votes';
END $$;

-- Message de confirmation
SELECT 'MIGRATION 43 TERMINEE - Statut pending_transfer ajouté avec automatisation' AS status;
