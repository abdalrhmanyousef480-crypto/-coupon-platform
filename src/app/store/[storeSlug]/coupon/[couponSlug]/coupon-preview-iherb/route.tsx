import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, Sparkle, CopyIcon, logoToPngDataUri } from "@/lib/coupon-og";

// نسخة اختبار من صورة الكوبون — محصورة بمتجر أيهيرب فقط (raajع
// AGENTS: طلب تجربة قياسات/تخطيط جديد على متجر واحد قبل التعميم على كل
// المتاجر). الفروقات عن opengraph-image.tsx الرسمية:
//   - قياس 400×400 (مربّع) بدل 1200×630.
//   - نص "كود الخصم" أكبر وأوضح نسبيًا لصغر حجم الصورة.
//   - تُعرض بصفحة الكوبون بعد قسم "عن المتجر" (راجع page.tsx) بدل قبله.
// أي مسار غير أيهيرب يرجع 404 — هاي الصورة مش للاستخدام العام لسا.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const { storeSlug, couponSlug } = await params;
  if (storeSlug !== "iherb") {
    return new Response("Not found", { status: 404 });
  }

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

  const storeName = coupon.store.name;
  const codeValue = coupon.code?.trim() || coupon.discountLabel || "";
  const logoDataUri = await logoToPngDataUri(coupon.store.logoUrl);
  const codeFontSize = codeValue.length > 14 ? 26 : codeValue.length > 8 ? 32 : 40;

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
          background: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Sparkle scale={0.7} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 110,
              height: 110,
              borderRadius: 24,
              background: SURFACE_ALT,
              overflow: "hidden",
            }}
          >
            {logoDataUri ? (
              <img src={logoDataUri} width={76} height={76} style={{ objectFit: "contain" }} />
            ) : (
              <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 42, fontWeight: 700, color: NAVY }}>
                {storeName.trim().charAt(0)}
              </div>
            )}
          </div>
          <Sparkle mirror scale={0.7} />
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 12,
            fontSize: 20,
            fontWeight: 700,
            color: NAVY,
            textAlign: "center",
            maxWidth: "85%",
          }}
        >
          {storeName}
        </div>

        {/* "كود الخصم" — أكبر وأوضح نسبيًا من نسخة الـ 1200×630 (طلب
            صريح لهاي التجربة)، عشان تضل مقروءة بوضوح رغم صغر الصورة. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
          <Sparkle scale={0.55} />
          <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 34, fontWeight: 700, color: CORAL }}>
            كود الخصم
          </div>
          <Sparkle mirror scale={0.55} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginTop: 14,
            background: NAVY,
            borderRadius: 18,
            border: "2.5px dashed rgba(255,255,255,0.5)",
            padding: "14px 26px",
            maxWidth: "82%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Tajawal",
              fontSize: codeFontSize,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            {codeValue}
          </div>
          <CopyIcon size={20} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <div style={{ display: "flex", width: 32, height: 2, background: BORDER }} />
          <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 13, fontWeight: 700, color: INK_MUTED }}>
            استخدم الكود عند الدفع
          </div>
          <div style={{ display: "flex", width: 32, height: 2, background: BORDER }} />
        </div>
      </div>
    ),
    {
      width: 400,
      height: 400,
      fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })),
    }
  );
}
