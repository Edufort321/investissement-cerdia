-- ============================================================
-- Migration 157 : Multi-Tenant — Phase 3.3 Billing & renouvellement
--
-- Ajoute le suivi du cycle de facturation annuel sur chaque tenant :
--   - next_renewal_date     : prochaine date d'echeance
--   - last_reminder_sent_at : pour ne pas re-envoyer le rappel 60j
--   - suspended_at          : quand le tenant a ete suspendu pour
--                             impaye (35j apres renewal date)
--
-- Workflow attendu :
--   1. Creation tenant   → next_renewal_date = start_date + 1 an
--   2. Cron quotidien    → 60j avant renewal → marque last_reminder_sent_at
--   3. Cron quotidien    → 30j apres renewal → status='suspended'
--   4. Admin "Renouveler" → push renewal_date +1 an, reset reminder/suspended
-- ============================================================

BEGIN;

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS next_renewal_date    DATE,
    ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_next_renewal
    ON organizations (next_renewal_date)
    WHERE plan != 'internal' AND status != 'archived';

COMMENT ON COLUMN organizations.next_renewal_date IS
'Date du prochain renouvellement annuel. NULL pour les tenants internes/demo. Mis a +1 an a la creation, push de +1 an au paiement.';

COMMENT ON COLUMN organizations.last_reminder_sent_at IS
'Timestamp du dernier rappel envoye pour le renouvellement courant. Set par le cron 60j avant renewal_date. Reset au renouvellement.';

COMMENT ON COLUMN organizations.suspended_at IS
'Timestamp de la suspension automatique pour impaye. Set par le cron 30j apres renewal_date si pas paye. Reset au renouvellement.';

-- Pour CERDIA Globale (interne), pas de date de renouvellement
UPDATE organizations
   SET next_renewal_date = NULL
 WHERE plan = 'internal';

-- Verification
SELECT id, name, plan, status, next_renewal_date, last_reminder_sent_at, suspended_at
  FROM organizations
 ORDER BY created_at;

COMMIT;
