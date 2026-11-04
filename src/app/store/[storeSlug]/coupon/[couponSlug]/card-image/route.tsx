import { serveStoredWebp } from "@/lib/serve-stored-webp";
import { db } from "@/lib/db";
import { renderCouponCardWebp } from "@/lib/coupon-card-render";

// صورة البطاقة المربّعة المعروضة داخل صفحة الكوبون فقط (بعد قسم "عن
// المتجر" — راجع page.tsx). مصدرها 800×800 فعليًا — ضعف حجم العرض
// (400×400 بالـ CSS) عمدًا، عشان تبقى حادة على شاشات retina. الصفحة
// تعرضها بـ next/image مع unoptimized عشان ما يمررها /_next/image
// (اللي كان يطلبها بعرض 828px من مصدر 400×400 الأصلي القديم — تكبير
// حقيقي لمصدر أصغر منه، وهذا سبب ضبابية النص المشتكى منها). مو راوت
// OG رسمي (مو opengraph-image.tsx بالاسم)، فـ Next ما بيربطها بـ
// og:image الميتاداتا تلقائيًا — تلك مسؤولية opengraph-image.tsx
// المجاور (1200×630) حصرًا. نفس التصميم بالضبط متل النسخة القديمة
// 400×400، بس كل قيمة بكسل مضاعفة (×2).
async function renderCouponCardImage(
  _request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, store: { slug: storeSlug } },
    include: { store: true },
  });

  // Exact snapshot is served as HTTP 200 WebP from this original URL.
  const snapshot = await serveStoredWebp(coupon?.legacyImageSnapshotUrl);
  if (snapshot) return snapshot;
  const storeName = coupon?.store.name ?? "كوبون نور";
  const codeValue = coupon?.code?.trim() || coupon?.discountLabel || "";
  const webp = await renderCouponCardWebp({ storeName, codeValue, logoUrl: coupon?.store.logoUrl });
  return new Response(new Uint8Array(webp), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Googlebot-Image should see a retryable response if font rendering fails,
// never a cached permanent-looking server error.
export async function GET(
  request: Request,
  context: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  try {
    return await renderCouponCardImage(request, context);
  } catch (error) {
    console.error("[coupon-card-image] generation failed:", error);
    return new Response("Image temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "120", "Cache-Control": "no-store" },
    });
  }
}
