-- Unified store/coupon hub page. Additive and nullable: older deployments ignore it.
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "hubCouponSlug" TEXT;
