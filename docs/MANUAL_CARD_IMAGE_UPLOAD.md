# Manual uploads + safe legacy preservation

New stores and coupons require an explicit manual image upload from the admin panel. The image is converted to WebP **once** upon upload and saved to Supabase Storage; its permanent URL is kept in `cardImageUrl`. No cron, auto-generation or bulk migration for new records.

**IMPORTANT FOR OLD IMAGES**: Keep the EXACT historical card-image, OG, and Instagram preview routes and their old URL references. The historical WebP artwork must NOT redirect to a logo or be replaced. A separate optional `legacyImageSnapshotUrl` may point to a byte-for-byte copy saved once via a deliberate manual tool. The original public path responds with identical image bytes and HTTP 200. Without such a copy, the old generator remains available as a compatibility fallback.

Use `docs/LEGACY_IMAGE_PRESERVATION.md` for careful one-at-a-time image archive instructions. Never merge without passing the build checks and comparing old image URLs.
