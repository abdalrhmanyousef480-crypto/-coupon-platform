// توليد صور الكوبونات تلقائيًا — يشتغل على GitHub Actions فقط (مو Vercel).
//
// لكل كوبون منشور نوعه CODE، بدون صورة يدوية، وكوده الحالي ما إله صورة مولّدة:
//   1. يرسم البطاقة بنفس التصميم المعتمد (src/lib/coupon-card-render.tsx)
//   2. يرفعها WebP على Supabase: store-logos/generated/coupons/<coupon-slug>-<code>.webp
//   3. يتأكد إن الملف المرفوع مطابق بايت ببايت
//   4. يحدّث autoImageUrl (/images/coupons/<file> على دومين الموقع) و autoImageCode
// الصور اليدوية (cardImageUrl) والصور التاريخية (legacyImageSnapshotUrl) ما تنلمس أبدًا.
//
// npx tsx scripts/generate-coupon-images.tsx --sample          رسم عينات بدون قاعدة بيانات → ./generated-images
// npx tsx scripts/generate-coupon-images.tsx                   معاينة: يرسم المطلوب بدون رفع أو تعديل
// npx tsx scripts/generate-coupon-images.tsx --apply           رفع + تحديث قاعدة البيانات
// npx tsx scripts/generate-coupon-images.tsx --apply --limit=10
import "dotenv/config";
import React from "react";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// السكربت يشتغل خارج Next (JSX كلاسيكي) — نفس نمط scripts/test-*.tsx.
Object.assign(globalThis, { React });

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(name + "="))?.slice(name.length + 1);
const isApply = args.includes("--apply");
const isSample = args.includes("--sample");
const limit = Math.max(1, Math.min(100, Number(flag("--limit") ?? 25) || 25));
const OUT_DIR = path.resolve(flag("--out") ?? "generated-images");
const STORAGE_DIR = "generated/coupons";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function isValidWebp(b: Buffer) {
  return b.length > 1000 && b.length < 3_000_000 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
}

// عينات ثابتة لفحص التصميم بدون أي أسرار (أسماء مختلطة عربي/إنجليزي وطويلة).
const SUPA_LOGOS = "https://gwqtzjqmvrcrvchqdvdi.supabase.co/storage/v1/object/public/store-logos/stores";
const SAMPLES = [
  { slug: "option-b-discount-code", storeName: "اوبشن بي | option b", code: "AA62", logoUrl: `${SUPA_LOGOS}/8a128e72-84d1-48ef-99b2-e7686dc29231.webp` },
  { slug: "max-discount-code", storeName: "ماكس | Max", code: "QY7", logoUrl: `${SUPA_LOGOS}/e34ec117-a1d3-489f-bce4-f382a59fdd1f.webp` },
  { slug: "firstcry-discount-code", storeName: "فيرستكراي | firstcry", code: "NW3", logoUrl: `${SUPA_LOGOS}/b22793f3-f846-44ea-9eb1-93eeef9cb364.webp` },
  { slug: "iherb-discount-code", storeName: "iHerb - ايهيرب", code: "DGK0899", logoUrl: `${SUPA_LOGOS}/fe93f804-18d6-4f25-bd42-5c7d32188947.webp` },
  { slug: "ghym-discount-code", storeName: "مناديل غيم", code: "ABBBA1", logoUrl: `${SUPA_LOGOS}/c7ea6e7b-3524-4009-aec9-48b53053f7b3.webp` },
  { slug: "long-name-discount-code", storeName: "متجر الأزياء العربية الفاخرة للنساء", code: "SUMMER2026SALE", logoUrl: null },
];

async function main() {
  const { renderCouponCardWebp } = await import("../src/lib/coupon-card-render");
  const { generatedCouponImageFile, GENERATED_COUPON_IMAGE_PREFIX } = await import("../src/lib/coupon-image");
  await mkdir(OUT_DIR, { recursive: true });

  if (isSample) {
    for (const s of SAMPLES) {
      const webp = await renderCouponCardWebp({ storeName: s.storeName, codeValue: s.code, logoUrl: s.logoUrl });
      if (!isValidWebp(webp)) throw new Error(`Invalid WebP for ${s.slug}`);
      const file = generatedCouponImageFile(s.slug, s.code);
      await writeFile(path.join(OUT_DIR, file), webp);
      console.log(`sample ${file} ${webp.length} bytes`);
    }
    return;
  }

  const { createScriptClient } = await import("./_client");
  const db = createScriptClient();
  let failures = 0;
  try {
    const now = new Date();
    const candidates = await db.coupon.findMany({
      where: {
        isPublished: true,
        type: "CODE",
        code: { not: null },
        cardImageUrl: null,
        store: { isPublished: true },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true, slug: true, code: true, autoImageCode: true,
        store: { select: { slug: true, name: true, logoUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    const pending = candidates.filter((c) => c.code?.trim() && c.autoImageCode !== c.code.trim()).slice(0, limit);
    console.log(`Mode: ${isApply ? "APPLY" : "PREVIEW"} — ${pending.length} coupon(s) need an image (limit ${limit}).`);

    const storage = isApply
      ? (await import("../src/lib/supabase")).getSupabaseAdmin().storage.from("store-logos")
      : null;

    for (const c of pending) {
      const code = c.code!.trim();
      const file = generatedCouponImageFile(c.slug, code);
      const label = `${c.store.slug}/${c.slug} [${code}] → ${file}`;
      try {
        const webp = await renderCouponCardWebp({ storeName: c.store.name, codeValue: code, logoUrl: c.store.logoUrl });
        if (!isValidWebp(webp)) throw new Error("rendered image is not a valid WebP");
        await writeFile(path.join(OUT_DIR, file), webp);
        if (!storage) {
          console.log(`preview ${label} (${webp.length} bytes)`);
          continue;
        }

        const objectPath = `${STORAGE_DIR}/${file}`;
        const up = await storage.upload(objectPath, webp, { upsert: true, contentType: "image/webp", cacheControl: "31536000" });
        if (up.error) throw new Error(`upload failed: ${up.error.message}`);
        const publicUrl = storage.getPublicUrl(objectPath).data.publicUrl;
        // يتجاوز كاش الـ CDN للتأكد إن النسخة الجديدة هي المحفوظة فعلًا.
        const check = await fetch(`${publicUrl}?verify=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
        const stored = Buffer.from(await check.arrayBuffer());
        if (!check.ok || sha(stored) !== sha(webp)) throw new Error("stored file does not match the rendered image");

        // لا نكتب إذا تغيّر الكود أو انرفعت صورة يدوية أثناء التوليد.
        const updated = await db.coupon.updateMany({
          where: { id: c.id, code: c.code, cardImageUrl: null },
          data: { autoImageUrl: `${GENERATED_COUPON_IMAGE_PREFIX}${file}`, autoImageCode: code },
        });
        console.log(updated.count ? `done ${label}` : `skipped ${label} (coupon changed meanwhile)`);
      } catch (error) {
        failures++;
        console.error(`FAILED ${label}:`, error instanceof Error ? error.message : error);
      }
    }
  } finally {
    await db.$disconnect();
  }
  if (failures) {
    console.error(`${failures} image(s) failed; they will be retried on the next run.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
