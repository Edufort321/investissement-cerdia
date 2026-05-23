-- Migration 173: add client contact fields to organizations
-- Used for SaaS billing profile (auto-fill invoices, display in admin)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS contact_name    TEXT,
  ADD COLUMN IF NOT EXISTS contact_email   TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT;
