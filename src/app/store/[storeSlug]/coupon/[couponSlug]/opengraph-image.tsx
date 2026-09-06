import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";

// صورة OG لكل كوبون — نفس الصورة تُعرض أيضًا كصورة صغيرة ثابتة تحت الكارت
// بصفحة الكوبون (راجع page.tsx)، مصدر واحد للاثنين. أربع عناصر بالضبط:
// شعار المتجر، اسم المتجر، عبارة "كود خصم"، وكود الكوبون نفسه.
export const alt = "كود خصم الكوبون";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
        }}
      >
        {logoDataUri && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 110,
              height: 110,
              borderRadius: 24,
              background: "#ffffff",
              padding: 14,
            }}
          >
            <img src={logoDataUri} width={82} height={82} style={{ objectFit: "contain" }} />
          </div>
        )}

        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 24,
            fontSize: 40,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "85%",
          }}
        >
          {storeName}
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 28,
            fontSize: 28,
            fontWeight: 700,
            color: "#CD3018",
          }}
        >
          كود خصم
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Tajawal",
            marginTop: 12,
            fontSize: 84,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "88%",
          }}
        >
          {codeValue}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })),
    }
  );
}
