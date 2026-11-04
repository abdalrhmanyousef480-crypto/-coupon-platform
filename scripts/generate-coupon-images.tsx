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
// داخل workflow coupon-images على main فقط (يحتاج توكن GitHub OIDC):
//   --preview يرسم المطلوب بدون حفظ، --apply يحفظ عبر دالة Supabase coupon-images
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

  // بدون أي مفاتيح سرية: GitHub يعطي الـ workflow توكن OIDC موقّع، ودالة Supabase
  // (supabase/functions/coupon-images) تتحقق منه ثم تقرأ/تكتب بصلاحياتها هي.
  const fnUrl = process.env.COUPON_IMAGES_FUNCTION_URL
    || "https://gwqtzjqmvrcrvchqdvdi.supabase.co/functions/v1/coupon-images";
  const githubToken = async () => {
    const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
    const bearer = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    if (!url || !bearer) throw new Error("GitHub OIDC is unavailable (run inside the coupon-images workflow on main).");
    const r = await fetch(`${url}&audience=couponsnoor-coupon-images`, { headers: { Authorization: `bearer ${bearer}` } });
    if (!r.ok) throw new Error(`OIDC token request failed: HTTP ${r.status}`);
    return ((await r.json()) as { value: string }).value;
  };
  const call = async (init: RequestInit & { query?: string } = {}) => {
    const r = await fetch(`${fnUrl}${init.query ?? ""}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${await githubToken()}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`function HTTP ${r.status}: ${(body as { error?: string }).error ?? "unknown error"}`);
    return body;
  };

  let failures = 0;
  const { coupons: pending } = (await call({ query: `?limit=${limit}` })) as {
    coupons: { id: string; slug: string; code: string; storeSlug: string; storeName: string; logoUrl: string | null }[];
  };
  console.log(`Mode: ${isApply ? "APPLY" : "PREVIEW"} — ${pending.length} coupon(s) need an image (limit ${limit}).`);

  for (const c of pending) {
    const file = generatedCouponImageFile(c.slug, c.code);
    const label = `${c.storeSlug}/${c.slug} [${c.code}] → ${file}`;
    try {
      const webp = await renderCouponCardWebp({ storeName: c.storeName, codeValue: c.code, logoUrl: c.logoUrl });
      if (!isValidWebp(webp)) throw new Error("rendered image is not a valid WebP");
      await writeFile(path.join(OUT_DIR, file), webp);
      if (!isApply) {
        console.log(`preview ${label} (${webp.length} bytes)`);
        continue;
      }
      const saved = (await call({
        method: "POST",
        body: JSON.stringify({ couponId: c.id, code: c.code, image: webp.toString("base64") }),
      })) as { ok: boolean; path: string; publicUrl: string; bytes: number };
      // نتأكد إن الملف المحفوظ مطابق بايت ببايت لما رسمناه.
      const check = await fetch(`${saved.publicUrl}?verify=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const stored = Buffer.from(await check.arrayBuffer());
      if (!check.ok || sha(stored) !== sha(webp)) throw new Error("stored file does not match the rendered image");
      console.log(saved.ok ? `done ${label} → ${saved.path}` : `skipped ${label} (coupon changed meanwhile)`);
    } catch (error) {
      failures++;
      console.error(`FAILED ${label}:`, error instanceof Error ? error.message : error);
    }
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
