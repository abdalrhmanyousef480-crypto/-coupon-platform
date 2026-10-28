-- This migration was applied to the production Supabase database on 2026-10-28.
-- The nullable column is intentionally NOT backfilled from lastCheckedAt:
-- lastCheckedAt was previously changed in bulk and is not proof of a real test.
-- Retain existing isVerified and lastCheckedAt data for historical continuity.
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS "manuallyVerifiedAt" TIMESTAMP(3) NULL;

COMMENT ON COLUMN public.coupons."manuallyVerifiedAt"
  IS 'Set only after an admin explicitly confirms a per-coupon checkout test; legacy bulk dates do not qualify.';
