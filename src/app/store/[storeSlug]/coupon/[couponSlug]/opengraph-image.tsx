import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, Sparkle, CopyIcon, ArabicText, logoToPngDataUri } from "@/lib/coupon-og";

// صورة OG الاجتماعية لكل كوبون — 1200×630 (المقاس المعياري لفيسبوك/تويتر/
// معاينات جوجل الكبيرة). هاي منفصلة عمدًا عن صورة البطاقة المربّعة
// المعروضة داخل الصفحة (راجع card-image/route.tsx، 800×800) — قبل هالفصل
// كانت نفس الصورة 400×400 تُستخدم كـ og:image كمان، وهيك صارت صغيرة/غير
// قياسية لمعاينات كبيرة. couponMetadata() (راجع src/lib/seo.ts) بتمرر
// رابط هالراوت صراحة كـ ogImage — ما بتعتمد على File Convention التلقائي
// لـ Next (كان السبب الحقيقي وراء عدم ظهور og:image إطلاقًا لصفحات
// الكوبونات: تمرير `images: undefined` صراحة بدل حذف المفتاح كان يمنع
// حقن Next التلقائي لملف opengraph-image.tsx، فتطلع الصفحة بلا og:image
// نهائيًا، وجوجل يضطر يخمّن من إشارات تانية — صورة الموقع العامة مثلًا).
export const alt = "كود خصم الكوبون";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ storeSlug: string; couponSlug: string }>;
}) {
  const tajawalBoldPromise = getTajawalBold();
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, store: { slug: storeSlug } },
    include: { store: true },
  });

  const storeName = coupon?.store.name ?? "كوبون نور";
  // كوبونات النوع DEAL ما إلها كود — نعرض قيمة الخصم بدل ما نسيب العنصر فاضي.
  const codeValue = coupon?.code?.trim() || coupon?.discountLabel || "";
  const [tajawalBold, logoDataUri] = await Promise.all([
    tajawalBoldPromise,
    coupon ? logoToPngDataUri(coupon.store.logoUrl) : Promise.resolve(null),
  ]);
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

        <ArabicText
          text={storeName}
          style={{ marginTop: 24, fontFamily: "Tajawal", fontSize: 34, fontWeight: 700, color: NAVY, maxWidth: "80%" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 34 }}>
          <Sparkle scale={0.6} />
          <ArabicText text="كود الخصم" style={{ fontFamily: "Tajawal", fontSize: 30, fontWeight: 700, color: CORAL }} />
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
          <ArabicText text="استخدم الكود عند الدفع" style={{ fontFamily: "Tajawal", fontSize: 22, fontWeight: 700, color: INK_MUTED }} />
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
