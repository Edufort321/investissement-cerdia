-- Migration 212 : Champs abonnement Stripe sur organizations
-- =====================================================================
-- Facturation récurrente des tenants (app investissement + C-Secur360, même table).
-- L'admin déclenche la création de l'abonnement annuel depuis OrganisationsTab ;
-- Stripe gère le renouvellement auto. Le webhook met à jour le statut ici.
--
-- next_renewal_date (mig.157) et is_billable (mig.172) existent déjà — on ajoute
-- le lien Stripe et le statut d'abonnement.
-- =====================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  -- statut Stripe : active | trialing | past_due | canceled | unpaid | incomplete | null
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan        TEXT,   -- ex: 'annual', 'annual+site'
  ADD COLUMN IF NOT EXISTS billing_email            TEXT,   -- destinataire des reçus Stripe
  ADD COLUMN IF NOT EXISTS current_period_end       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_org_stripe_customer
  ON organizations (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_stripe_subscription
  ON organizations (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN organizations.stripe_customer_id IS 'Customer Stripe du tenant (créé à l''activation de l''abonnement).';
COMMENT ON COLUMN organizations.subscription_status IS 'Statut de l''abonnement Stripe, synchronisé par le webhook.';

SELECT 'Migration 212 OK — champs Stripe ajoutés à organizations' AS resultat;
