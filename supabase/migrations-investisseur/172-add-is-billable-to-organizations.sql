-- Migration 172: add is_billable flag to organizations
-- Controls whether an org counts toward SaaS revenue (dashboard + future invoicing)
-- demo and internal orgs default to false; all others default to true

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN NOT NULL DEFAULT true;

-- Demo and internal tenants are not billable
UPDATE organizations
SET is_billable = false
WHERE plan IN ('internal', 'demo');
