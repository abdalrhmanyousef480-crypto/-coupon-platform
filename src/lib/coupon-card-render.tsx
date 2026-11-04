import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, Sparkle, CopyIcon, ArabicText, logoToPngDataUri, measureWordWidths, tajawalOgFonts } from "@/lib/coupon-og";

const NAME_SIZE = 40;
const TITLE_TEXT = "كود الخصم";
const TITLE_SIZE = 68;
const HINT_TEXT = "استخدم الكود عند الدفع";
const HINT_SIZE = 26;

// تصميم بطاقة الكوبون المعتمد (800×800 WebP). مصدر واحد يستخدمه:
// - راوت card-image (الصور القديمة وأي كوبون بدون صورة محفوظة)
// - سكربت التوليد التلقائي على GitHub Actions (scripts/generate-coupon-images.tsx)
// فأي تعديل بالتصميم يطلع بنفس الشكل بالمكانين.
export async function renderCouponCardWebp(input: {
  storeName: string;
  codeValue: string;
  logoUrl: string | null | undefined;
}): Promise<Buffer> {
  const { storeName, codeValue } = input;
  const [tajawalBold, logoDataUri] = await Promise.all([
    getTajawalBold(),
    input.logoUrl ? logoToPngDataUri(input.logoUrl) : Promise.resolve(null),
  ]);
  const codeFontSize = codeValue.length > 14 ? 52 : codeValue.length > 8 ? 64 : 80;
  const fonts = tajawalOgFonts(tajawalBold);
  // عرض الحبر الحقيقي لكل كلمة (راجع measureWordWidths) — يمنع الفراغات الكبيرة بين الكلمات.
  const [nameWidths, titleWidths, hintWidths] = await Promise.all([
    measureWordWidths(storeName, NAME_SIZE, fonts),
    measureWordWidths(TITLE_TEXT, TITLE_SIZE, fonts),
    measureWordWidths(HINT_TEXT, HINT_SIZE, fonts),
  ]);

  const pngResponse = new ImageResponse(
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
          widths={nameWidths}
          style={{ marginTop: 24, fontFamily: "Tajawal", fontSize: NAME_SIZE, fontWeight: 700, color: NAVY, maxWidth: "85%" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 36 }}>
          <Sparkle scale={1.1} />
          <ArabicText text={TITLE_TEXT} widths={titleWidths} style={{ fontFamily: "Tajawal", fontSize: TITLE_SIZE, fontWeight: 700, color: CORAL }} />
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

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
          <div style={{ display: "flex", width: 64, height: 4, background: BORDER }} />
          <ArabicText text={HINT_TEXT} widths={hintWidths} style={{ fontFamily: "Tajawal", fontSize: HINT_SIZE, fontWeight: 700, color: INK_MUTED }} />
          <div style={{ display: "flex", width: 64, height: 4, background: BORDER }} />
        </div>
      </div>
    ),
    {
      width: 800,
      height: 800,
      fonts,
    }
  );

  const pngBuffer = Buffer.from(await pngResponse.arrayBuffer());
  return sharp(pngBuffer).webp({ quality: 88, effort: 5 }).toBuffer();
}
