import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, Sparkle, CopyIcon, logoToPngDataUri } from "@/lib/coupon-og";

// صورة OG لكل كوبون — نفس الصورة تُعرض أيضًا كصورة صغيرة ثابتة تحت الكارت
// بصفحة الكوبون (راجع page.tsx). التصميم مبني على مرجع بصري بأسلوب
// "بطاقة هدية premium": خلفية بيضاء، صندوق شعار بزوايا دائرية، زخارف
// شفرون مزدوجة (سبارك) على الجانبين، وصندوق الكود بحدود متقطّعة —
// بألوان هويتنا (كحلي/كورال من tailwind.config.ts) بدل ألوان المرجع.
// العناصر المشتركة (الألوان، Sparkle، CopyIcon، تحويل الشعار) بـ
// src/lib/coupon-og.tsx — تستخدمها كمان نسخة الاختبار الخاصة بأيهيرب
// (راجع coupon-preview-iherb/route.tsx) قبل ما نعمم أي تعديل مستقبلي.
export const alt = "كود خصم الكوبون";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ storeSlug: string; couponSlug: string }>;
}) {
  const { storeSlug, couponSlug } = await params;
  const [coupon, tajawalBold] = await Promise.all([
    db.coupon.findFirst({
      where: { slug: couponSlug, store: { slug: storeSlug } },
      include: { store: true },
    }),
    getTajawalBold(),
  ]);

  const storeName = coupon?.store.name ?? "كوبون نور";
  // كوبونات النوع DEAL ما إلها كود — نعرض قيمة الخصم بدل ما نسيب العنصر فاضي.
  const codeValue = coupon?.code?.trim() || coupon?.discountLabel || "";
  const logoDataUri = coupon ? await logoToPngDataUri(coupon.store.logoUrl) : null;
  const codeFontSize = codeValue.length > 14 ? 44 : codeValue.length > 8 ? 56 : 72;

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
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Sparkle />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 168,
              height: 168,
              borderRadius: 36,
              background: SURFACE_ALT,
              overflow: "hidden",
            }}
          >
            {logoDataUri ? (
              <img src={logoDataUri} width={116} height={116} style={{ objectFit: "contain" }} />
            ) : (
              <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 64, fontWeight: 700, color: NAVY }}>
                {storeName.trim().charAt(0)}
              </div>
            )}
          </div>
          <Sparkle mirror />
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 24,
            fontSize: 34,
            fontWeight: 700,
            color: NAVY,
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          {storeName}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 34 }}>
          <Sparkle scale={0.6} />
          <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 30, fontWeight: 700, color: CORAL }}>
            كود الخصم
          </div>
          <Sparkle mirror scale={0.6} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            marginTop: 22,
            background: NAVY,
            borderRadius: 26,
            border: "3px dashed rgba(255,255,255,0.5)",
            padding: "22px 52px",
            maxWidth: "80%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Tajawal",
              fontSize: codeFontSize,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: 2,
              textAlign: "center",
            }}
          >
            {codeValue}
          </div>
          <CopyIcon />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 30 }}>
          <div style={{ display: "flex", width: 64, height: 2, background: BORDER }} />
          <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 22, fontWeight: 700, color: INK_MUTED }}>
            استخدم الكود عند الدفع
          </div>
          <div style={{ display: "flex", width: 64, height: 2, background: BORDER }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })),
    }
  );
}
