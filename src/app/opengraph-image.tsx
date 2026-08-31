import { ImageResponse } from "next/og";

// صورة OG افتراضية على مستوى الموقع كامل — تُستخدم تلقائيًا لأي صفحة ما
// بتحدد ogImage خاص فيها (التصنيفات، الصفحات الثابتة، الرئيسية). نص
// لاتيني فقط: Satori (محرّك next/og) ما بيدعم خطوط عربية افتراضيًا، وما
// قدرنا نتحقق من تحميل خط عربي مخصص بالـ edge runtime بدون تشغيل السيرفر.
export const alt = "Couponeta — Save more with the best discount codes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 22,
              background: "#E8543E",
              color: "#ffffff",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            %
          </div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 64, fontWeight: 800, letterSpacing: -1 }}>
            Couponeta
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 28, color: "rgba(255,255,255,0.7)", fontSize: 30 }}>
          Verified discount codes & deals
        </div>
      </div>
    ),
    { ...size }
  );
}
