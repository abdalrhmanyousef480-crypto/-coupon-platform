import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, Sparkle, CopyIcon, ArabicText, logoToPngDataUri } from "@/lib/coupon-og";

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
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const tajawalBoldPromise = getTajawalBold();
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, store: { slug: storeSlug } },
    include: { store: true },
  });

  const storeName = coupon?.store.name ?? "كوبون نور";
  const codeValue = coupon?.code?.trim() || coupon?.discountLabel || "";
  const [tajawalBold, logoDataUri] = await Promise.all([
    tajawalBoldPromise,
    coupon ? logoToPngDataUri(coupon.store.logoUrl) : Promise.resolve(null),
  ]);
  const codeFontSize = codeValue.length > 14 ? 52 : codeValue.length > 8 ? 64 : 80;

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
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Sparkle scale={1.4} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 220,
              height: 220,
              borderRadius: 48,
              background: SURFACE_ALT,
              overflow: "hidden",
            }}
          >
            {logoDataUri ? (
              <img src={logoDataUri} width={152} height={152} style={{ objectFit: "contain" }} />
            ) : (
              <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 84, fontWeight: 700, color: NAVY }}>
                {storeName.trim().charAt(0)}
              </div>
            )}
          </div>
          <Sparkle mirror scale={1.4} />
        </div>

        <ArabicText
          text={storeName}
          style={{ marginTop: 24, fontFamily: "Tajawal", fontSize: 40, fontWeight: 700, color: NAVY, maxWidth: "85%" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 36 }}>
          <Sparkle scale={1.1} />
          <ArabicText text="كود الخصم" style={{ fontFamily: "Tajawal", fontSize: 68, fontWeight: 700, color: CORAL }} />
          <Sparkle mirror scale={1.1} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            marginTop: 28,
            background: NAVY,
            borderRadius: 36,
            border: "5px dashed rgba(255,255,255,0.5)",
            padding: "28px 52px",
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
              letterSpacing: 2,
              textAlign: "center",
            }}
          >
            {codeValue}
          </div>
          <CopyIcon size={40} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 28 }}>
          <div style={{ display: "flex", width: 64, height: 4, background: BORDER }} />
          <ArabicText text="استخدم الكود عند الدفع" style={{ fontFamily: "Tajawal", fontSize: 26, fontWeight: 700, color: INK_MUTED }} />
          <div style={{ display: "flex", width: 64, height: 4, background: BORDER }} />
        </div>
      </div>
    ),
    {
      width: 800,
      height: 800,
      fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })),
    }
  );
}
