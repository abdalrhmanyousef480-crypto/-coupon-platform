import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";

// صورة OG لكل كوبون — نفس الصورة تُعرض أيضًا كصورة صغيرة ثابتة تحت الكارت
// بصفحة الكوبون (راجع page.tsx). التصميم مبني على مرجع بصري بأسلوب
// "بطاقة هدية premium": خلفية بيضاء، صندوق شعار بزوايا دائرية، زخارف
// شفرون مزدوجة (سبارك) على الجانبين، وصندوق الكود بحدود متقطّعة —
// بألوان هويتنا (كحلي/كورال من tailwind.config.ts) بدل ألوان المرجع.
export const alt = "كود خصم الكوبون";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#14213D";
const NAVY_SOFT = "#8D95B3"; // درجة كحلي فاتحة لزخارف الشفرون الثانوية
const CORAL = "#CD3018";
const SURFACE_ALT = "#F4F3EF";
const BORDER = "#E7E5E0";
const INK_MUTED = "#686F7D";

// Satori (محرّك next/og) ما بيقدر يفك ترميز WebP لعناصر <img> — وشعارات
// المتاجر المرفوعة عبر لوحة التحكم مخزّنة كـ WebP (راجع store-logos بـ
// Supabase). لازم نحوّلها PNG بالذاكرة عبر sharp (متوفرة أصلًا كـ dependency
// لمعالجة رفع الشعارات، راجع src/lib/actions-upload.ts).
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

// زخرفة شفرون مزدوجة (خط سميك كحلي + خط رفيع كحلي فاتح) تحاكي علامة
// "سباركل" بالمرجع البصري. mirror بتعكس اتجاه الرأس عشان تحيط العنصر
// من الجهتين بشكل متناظر.
function Sparkle({ mirror = false, scale = 1 }: { mirror?: boolean; scale?: number }) {
  const dir = mirror ? -1 : 1;
  const bigW = 30 * scale;
  const bigH = 7 * scale;
  const smallW = 19 * scale;
  const smallH = 5 * scale;
  return (
    <div style={{ display: "flex", position: "relative", width: 46 * scale, height: 36 * scale }}>
      <div
        style={{
          position: "absolute",
          width: bigW,
          height: bigH,
          borderRadius: bigH / 2,
          background: NAVY,
          top: 2 * scale,
          left: mirror ? 0 : 16 * scale,
          transform: `rotate(${38 * dir}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: bigW,
          height: bigH,
          borderRadius: bigH / 2,
          background: NAVY,
          top: 27 * scale,
          left: mirror ? 0 : 16 * scale,
          transform: `rotate(${-38 * dir}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: smallW,
          height: smallH,
          borderRadius: smallH / 2,
          background: NAVY_SOFT,
          top: 9 * scale,
          left: mirror ? 20 * scale : 0,
          transform: `rotate(${38 * dir}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: smallW,
          height: smallH,
          borderRadius: smallH / 2,
          background: NAVY_SOFT,
          top: 21 * scale,
          left: mirror ? 20 * scale : 0,
          transform: `rotate(${-38 * dir}deg)`,
        }}
      />
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ display: "flex" }}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M16 8V6.5C16 5.67157 15.3284 5 14.5 5H6.5C5.67157 5 5 5.67157 5 6.5V14.5C5 15.3284 5.67157 16 6.5 16H8" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  );
}

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
