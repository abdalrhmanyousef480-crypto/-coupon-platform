import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, Sparkle, CopyIcon, logoToPngDataUri } from "@/lib/coupon-og";

// صورة OG لكل كوبون — نفس الصورة تُعرض أيضًا كصورة صغيرة ثابتة بصفحة
// الكوبون (راجع page.tsx، بعد قسم "عن المتجر"). التصميم النهائي (مربّع
// 400×400، نص "كود الخصم" أكبر) جُرّب أول مرة على أيهيرب فقط قبل ما
// نعممه على كل المتاجر. مبني على مرجع بصري بأسلوب "بطاقة هدية premium":
// خلفية بيضاء، صندوق شعار بزوايا دائرية، زخارف شفرون مزدوجة (سبارك) على
// الجانبين، وصندوق الكود بحدود متقطّعة — بألوان هويتنا (كحلي/كورال من
// tailwind.config.ts) بدل ألوان المرجع. العناصر المشتركة بـ
// src/lib/coupon-og.tsx.
export const alt = "كود خصم الكوبون";
export const size = { width: 400, height: 400 };
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
            direction: "rtl",
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

        {/* "كود الخصم" — كبير وواضح، يضل مقروء رغم صغر حجم الصورة.
            direction: rtl صريحة على نص العنوان نفسه (مو على الصف اللي
            فيه الزخارف) عشان نضمن ترتيب bidi صحيح بمحرك Satori بدون ما
            نأثر على ترتيب عناصر الـ flex (الزخارف) جنبه. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
          <Sparkle scale={0.55} />
          <div style={{ display: "flex", direction: "rtl", fontFamily: "Tajawal", fontSize: 34, fontWeight: 700, color: CORAL }}>
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
          <div style={{ display: "flex", direction: "rtl", fontFamily: "Tajawal", fontSize: 13, fontWeight: 700, color: INK_MUTED }}>
            استخدم الكود عند الدفع
          </div>
          <div style={{ display: "flex", width: 32, height: 2, background: BORDER }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })),
    }
  );
}
