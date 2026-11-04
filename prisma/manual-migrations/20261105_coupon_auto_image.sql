-- Auto-generated coupon card images (GitHub Actions). Nullable, additive only.
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS "autoImageUrl" text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS "autoImageCode" text;
