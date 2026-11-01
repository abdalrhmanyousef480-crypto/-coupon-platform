-- Independent from cardImageUrl for new admin uploads; no data backfill or URL rewrites.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS "legacyImageSnapshotUrl" text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS "legacyImageSnapshotUrl" text;
