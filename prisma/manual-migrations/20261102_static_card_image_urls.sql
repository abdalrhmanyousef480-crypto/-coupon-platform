-- Add nullable, backwards-compatible pointers to stable WebP files on Supabase Storage.
-- No live data is modified. Apply before deploying the corresponding Prisma model.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS "cardImageUrl" text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS "cardImageUrl" text;
