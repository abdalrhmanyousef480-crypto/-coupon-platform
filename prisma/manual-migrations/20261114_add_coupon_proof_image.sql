-- Proof screenshot of a code applied at checkout (owner decision, 14 Nov 2026).
-- Shown on the store page under the coupon image; served straight from Supabase
-- Storage, whose x-robots-tag keeps it out of Google Images so it never competes
-- with the coupon card image.
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS "proofImageUrl" text;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS "proofCheckedAt" timestamp(3);
