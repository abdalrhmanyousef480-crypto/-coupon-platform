# Keep old indexed coupon and store images intact (2026-11-02)

**Owner requirement:** do not change existing card artwork, URLs, codes, slugs or the image references Google has indexed. New coupons/stores may have an explicit manual upload.

Current old card image endpoints generate images dynamically using `ImageResponse`, Sharp, and fonts. On any origin failure Googlebot may receive HTTP 503. This is a possible cause of intermittent image discovery, **not proven**. GSC Wizard is unavailable (trial ended) and Vercel deployment/runtime logs are inaccessible to the current connector, so avoid ungrounded claims about the root cause.

## Migration
- `cardImageUrl`: manual image uploads for **new** coupons and stores. Stored in public Supabase Storage.
- `legacyImageSnapshotUrl`: immutable, byte-identical archive of a **previously published** image at its existing URL.
- Original legacy page image src, image sitemap entries, and OG remain unchanged unless the admin explicitly replaces an image.
- Legacy image handlers first look for a snapshot and respond with image bytes and **HTTP 200** at the same original URL. They **never 307-redirect to a store logo**.
- If there is no snapshot or Supabase is temporarily unreachable, retain the existing generator as fallback (so no existing image goes blank).

## Manual archival protocol (NO AUTO BATCH)
1. Run `npx tsx scripts/archive-legacy-card-image.ts --store=ghym` to preview.
2. Run `npx tsx scripts/archive-legacy-card-image.ts --store=ghym --apply` deliberately for a SINGLE existing store.
3. Test same original image URL status 200, identical SHA-256, SEO, sitemap, and Google Image appearance before considering the next image.
4. Run one specific coupon `--coupon-store=ghym --coupon=slug --apply`, not an entire sitemap.
5. Stop on any error; no automatic cron or generation for a large batch. No changes to production code until preview build and tests pass.

This architecture does not guarantee any particular Google ranking or image SERP placement.
