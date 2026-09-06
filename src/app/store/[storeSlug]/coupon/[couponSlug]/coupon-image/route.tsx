import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold, getJetBrainsMonoBold } from "@/lib/og-font";

// صورة "الكوبون الكاملة" — قابلة للتنزيل من زر "تنزيل صورة الكوبون" بصفحة
// الكوبون (راجع CouponFullImageSection). مختلفة عن opengraph-image.tsx:
// هذي مصممة للتنزيل المباشر (كود الكوبون كنص ظاهر وبارز بالصورة نفسها)،
// مو بس لمعاينة مشاركة اجتماعية.
// next/og (@vercel/og تحت resvg) ما بيدعم WebP — PNG هو الوحيد المتاح.
export const runtime = "nodejs"; // sharp لازم Node.js runtime (native binary) — ما بيشتغل على edge

// كاش HTTP صريح — نفس مدة revalidate الخاصة بصفحة الكوبون (page.tsx) عشان
// التطابق: أول طلب بيتولّد بطء (خط + شعار + sharp + resvg)، وبعدها الـ CDN
// (أو المتصفح) بيرجّع نفس الاستجابة فورًا لحد ما تنتهي الساعة، مع
// stale-while-revalidate يوم كامل عشان أي طلب بعد انتهاء الصلاحية يرجّع
// النسخة القديمة فورًا بينما تتجدد بالخلفية بدل ما ينتظر المستخدم توليد جديد.
const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

// ألوان الموقع الرسمية (نفس القيم بالضبط من tailwind.config.ts) — ما فيه
// أي لون هون "طالع من فراغ".
const COLORS = {
  primary: "#14213D",
  primaryHover: "#1E2E52",
  accent: "#CD3018",
  surface: "#FFFFFF",
  ink: "#1A1D29",
};

const size = { width: 1200, height: 630 };

// Satori (محرّك next/og) ما بيقدر يفك ترميز WebP لعناصر <img> — وكل شعارات
// المتاجر مخزّنة كـ WebP (راجع store-logos بـ Supabase). لازم نحوّلها PNG
// بالذاكرة عبر sharp (متوفرة أصلًا كـ dependency) قبل تمريرها كـ data URI.
// مكاشة بالذاكرة على مستوى الـ module (نفس نمط fontCache بـ og-font.ts) —
// كل كوبونات نفس المتجر بتشارك نفس الشعار، فمافيه داعي نجيبه من Supabase
// ونحوّله من جديد بكل طلب: أغلب زمن الاستجابة (~3 ثواني) كان راجع لهذا
// الجلب/التحويل المتكرر، مو لتوليد الصورة نفسه.
const logoCache = new Map<string, Promise<string | null>>();

async function logoToPngDataUri(url: string): Promise<string | null> {
  let cached = logoCache.get(url);
  if (cached) return cached;

  cached = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      const png = await sharp(buffer).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    } catch {
      return null;
    }
  })();
  // ما نكاش الفشل — لو الشعار فشل مؤقتًا (مشكلة شبكة عابرة)، بدنا الطلب
  // الجاي يعيد المحاولة بدل ما يضل يرجّع null للأبد لحد إعادة تشغيل السيرفر.
  cached.then((result) => {
    if (result === null) logoCache.delete(url);
  });
  logoCache.set(url, cached);
  return cached;
}

/** حجم خط كود الكوبون يتصغّر مع طول النص عشان يضل بسطر واحد جوا الـ pill
 *  بدون ما نحتاج قياس DOM فعلي (مش متاح وقت render السيرفر). */
function codeFontSize(code: string): number {
  if (code.length <= 8) return 92;
  if (code.length <= 12) return 68;
  if (code.length <= 16) return 52;
  return 40;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const { storeSlug, couponSlug } = await params;
  const [coupon, tajawalBold, jetBrainsMonoBold] = await Promise.all([
    db.coupon.findFirst({
      where: { slug: couponSlug, store: { slug: storeSlug } },
      include: { store: true },
    }),
    getTajawalBold(),
    getJetBrainsMonoBold(),
  ]);

  if (!coupon) {
    return new Response("Not found", { status: 404 });
  }

  const logoDataUri = await logoToPngDataUri(coupon.store.logoUrl);

  // كوبونات النوع DEAL ما إلها كود — نعرض قيمة الخصم بدل الكود بنفس شكل
  // الـ pill، بس بخط Tajawal (مو Mono) لأنها مو "كود" فعليًا.
  const hasCode = Boolean(coupon.code);
  const pillLabel = hasCode ? "كود خصم" : "العرض";
  const pillValue = hasCode ? coupon.code!.trim() : coupon.discountLabel;

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
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryHover} 100%)`,
          padding: "56px 80px",
        }}
      >
        {/* شعار المتجر — بطاقة بيضاء خلفه للتباين لو الشعار شفاف/داكن */}
        {logoDataUri && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 130,
              height: 130,
              borderRadius: 28,
              background: COLORS.surface,
              padding: 18,
              boxShadow: "0 12px 32px rgba(20,33,61,0.28)",
            }}
          >
            <img src={logoDataUri} width={94} height={94} style={{ objectFit: "contain" }} />
          </div>
        )}

        {/* "كود خصم" — عبارة مستقلة */}
        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 28,
            fontSize: 30,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: 1,
          }}
        >
          {pillLabel}
        </div>

        {/* اسم المتجر */}
        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 14,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.surface,
            textAlign: "center",
            maxWidth: "85%",
          }}
        >
          {coupon.store.name}
        </div>

        {/* كود الكوبون — أبرز عنصر بالصورة: pill أبيض بحدود متقطعة وخط Mono ضخم */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 36,
            padding: "30px 68px",
            borderRadius: 28,
            background: COLORS.surface,
            border: `4px dashed ${COLORS.accent}`,
            maxWidth: "88%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: hasCode ? "JetBrains Mono" : "Tajawal",
              fontSize: hasCode ? codeFontSize(pillValue) : 56,
              fontWeight: 700,
              color: COLORS.primary,
              letterSpacing: hasCode ? 4 : 0,
              whiteSpace: "nowrap",
            }}
          >
            {pillValue}
          </div>
        </div>

        {/* "كوبون نور" — تذييل خفيف بالأسفل */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            %
          </div>
          <div style={{ display: "flex", fontFamily: "Tajawal", color: "rgba(255,255,255,0.55)", fontSize: 20, fontWeight: 700 }}>
            كوبون نور
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { "Cache-Control": CACHE_CONTROL },
      fonts: [
        ...tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })),
        ...jetBrainsMonoBold.map((data) => ({ name: "JetBrains Mono", data, weight: 700 as const, style: "normal" as const })),
      ],
    }
  );
}
