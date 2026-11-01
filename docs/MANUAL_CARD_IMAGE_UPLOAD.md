# Manual image uploads for store and coupon pages

The previous public `card-image`, `opengraph-image` and `instagram-preview` routes rendered images on each cache miss using ImageResponse and Sharp. This inflated Vercel Fluid CPU and exposed Googlebot to possible transient 503 responses.

## New behavior
- Admin store and coupon forms each have a manual image uploader.
- Only a deliberate admin upload calls Sharp once to resize/convert a WebP, then uploads unique immutable assets to the existing public `store-logos` Supabase Storage bucket under `manual-card-images/`.
- The public URL is stored in nullable `cardImageUrl` in `stores` / `coupons`.
- The image appears in the page, Open Graph metadata, and image sitemap, provided the admin uploaded it.
- When no manual image is available, the public page uses its existing store logo; **no generated coupon card image is requested**.
- Legacy generation endpoints issue lightweight 307 redirects to the stored manual image or store logo (no Satori, font fetch or Sharp).
- No batch processing, auto-backfill, scheduled image generation, or changes to existing coupon/store content.
- Updating a coupon offer or store name/logo clears a stale manual card image if the admin did not replace it, preventing misleading art.

## Safe rollout
1. Apply the nullable migration `prisma/manual-migrations/20261102_static_card_image_urls.sql` before deploying (already applied and verified for this project on Nov 2, 2026).
2. Ensure Supabase `store-logos` public bucket exists (it already does).
3. Run a preview build and test adding and editing one unpublished coupon and a store. Do not test against live published content.
4. Before merging, verify that legacy Instagram preview consumers can follow a redirect to WebP. The Instagram Graph API may require a JPEG URL; if so, implement a manual JPEG upload for social instead of relying on the WebP link.
5. Compare CPU and old/new image URLs after deployment. Google Image result stability is not guaranteed.

## SEO caveat
Previously indexed generated image URLs now redirect to the store logo unless a static image was uploaded. This is intentional to stop repeated CPU load, but it may affect the images Google displays for older coupons. Page URLs and canonicals remain unchanged.
