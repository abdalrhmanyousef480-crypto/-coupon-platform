import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";

// صورة "الكوبون الكاملة" — تُعرض فقط لما المستخدم يفتح قسم "عرض صورة
// الكوبون الكاملة" بصفحة الكوبون (راجع CouponFullImageSection). مختلفة عن
// opengraph-image.tsx: هذي مصممة للعرض/التحميل المباشر (تتضمن كود الكوبون
// كنص ظاهر بالصورة نفسها)، مو بس لمعاينة مشاركة اجتماعية.
// next/og (@vercel/og تحت resvg) ما بيدعم WebP — PNG هو الوحيد المتاح.
export const runtime = "nodejs"; // sharp لازم Node.js runtime (native binary) — ما بيشتغل على edge

// ملاحظة: `size` هون constant عادي مو export — لأن هذا route handler عادي
// (route.tsx) مو ملف metadata convention زي opengraph-image.tsx، وأي export
// غير GET/HEAD/... أو الحقول المسموحة (runtime, dynamic, revalidate...)
// بيفشّل type-check الخاص بـ next build (next.js يتحقق من شكل exports الـ route
// عبر أنواع مولّدة تلقائيًا — ما بيلتقطها tsc العادي، بس next build نفسه).
const size = { width: 1200, height: 630 };

// Satori (محرّك next/og) ما بيقدر يفك ترميز WebP لعناصر <img> — وكل شعارات
// المتاجر مخزّنة كـ WebP (راجع store-logos بـ Supabase). لازم نحوّلها PNG
// بالذاكرة عبر sharp (متوفرة أصلًا كـ dependency) قبل تمريرها كـ data URI.
async function logoToPngDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const png = await sharp(buffer).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const { storeSlug, couponSlug } = await params;
  const [coupon, tajawalBold] = await Promise.all([
    db.coupon.findFirst({
      where: { slug: couponSlug, store: { slug: storeSlug } },
      include: { store: true },
    }),
    getTajawalBold(),
  ]);

  if (!coupon) {
    return new Response("Not found", { status: 404 });
  }

  const logoDataUri = await logoToPngDataUri(coupon.store.logoUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14213D 0%, #1E2E52 100%)",
          padding: "70px 96px",
        }}
      >
        {logoDataUri && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 24,
              background: "#ffffff",
              padding: 16,
            }}
          >
            <img src={logoDataUri} width={88} height={88} style={{ objectFit: "contain" }} />
          </div>
        )}

        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 28,
            fontSize: 40,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "85%",
          }}
        >
          {coupon.store.name}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 104,
            fontWeight: 800,
            color: "#CD3018",
            lineHeight: 1,
            marginTop: 24,
            textAlign: "center",
            maxWidth: "90%",
          }}
        >
          {coupon.discountLabel}
        </div>

        {coupon.code && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 32,
              padding: "18px 48px",
              borderRadius: 16,
              border: "3px dashed rgba(255,255,255,0.5)",
              fontFamily: "Tajawal",
              fontSize: 40,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: 4,
              maxWidth: "90%",
            }}
          >
            {coupon.code}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "#CD3018",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            %
          </div>
          <div style={{ display: "flex", fontFamily: "Tajawal", color: "rgba(255,255,255,0.85)", fontSize: 22, fontWeight: 700 }}>
            كوبون نور
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })),
    }
  );
}
