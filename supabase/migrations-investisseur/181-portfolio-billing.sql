-- Migration 181: Portfolio billing tracking
ALTER TABLE portfolio_profiles
  ADD COLUMN IF NOT EXISTS is_organization boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS is_paid         boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS paid_at         timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_due     date;

NOTIFY pgrst, 'reload schema';
