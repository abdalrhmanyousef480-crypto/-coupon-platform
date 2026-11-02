-- Nullable, backward-compatible URLs. No existing rows or images are changed.
-- Both names are present in the deployed Supabase DB (verified 2026-11-02).
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS "cardImageUrl" text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS "cardImageUrl" text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS "legacyImageSnapshotUrl" text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS "legacyImageSnapshotUrl" text;
