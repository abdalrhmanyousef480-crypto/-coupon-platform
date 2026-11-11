-- Store shopping info (shipping, returns, payment, products, highlights, FAQ,
-- sources) shown under the codes on the store page. Nullable, additive only.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS "storeInfo" jsonb;
