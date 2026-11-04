# New-image automation for couponsnoor.com — safely staged

## Scope
- Generate WebP for **newly created** store and coupon rows only, with `createdAt >= 2026-11-04T00:00:00Z`.
- A row must have **no** `cardImageUrl` and **no** `legacyImageSnapshotUrl`.
- Existing manual images, archived image bytes, historical URLs, and manually overridden designs must remain unchanged.
- GitHub Actions computes images and uploads directly to public Supabase Storage. Vercel never renders these new images.
- Manual upload always wins; concurrent edits are protected by a conditional database update.
- Images are 1200×1200 store or 800×800 coupon WebP, with readable Arabic and English separately.
- No image-index ranking is guaranteed.

## Activation after review
1. Review and test this PR. Do **not** automatically merge solely to enable a cron.
2. Set GitHub Actions secret `SUPABASE_SERVICE_ROLE_KEY` in the repository's Actions secrets. Never paste it into chat or commit.
3. Set repository Actions variable `CARD_IMAGE_AUTOGEN_ENABLED=true` only once the release and test are approved.
4. Test the new runner in workflow_dispatch with apply=false on main. Then test one new store or coupon with apply=true.
5. Workflow runs at minutes 11, 31, and 51 UTC, at best-effort intervals. GitHub may delay or drop scheduled runs.
6. Avoid deleting existing images. Should an upload fail, the previous DB field is unchanged and the next run retries.

## SEO details
Existing Next.js sitemap already declares image URLs, public pages have descriptive alt and ImageObject, and archive routes preserve HTTP 200 old image bytes.
New content uses its direct WebP URL once the job finishes. Pending content temporarily uses the existing store logo instead of invoking the historical Vercel renderer.
Pages currently have an ISR revalidate of 3600 seconds; new image references may appear after this cache period unless the admin revalidates the page.

## Rendering accuracy and safety
- A coupon without a real code is labeled as an offer, never a fabricated discount code.
- A merchant-logo download failure causes a retry, not a permanent logo-less replacement.
- The worker only accepts logos on this Supabase project's domain or the currently supported Google favicon host.
