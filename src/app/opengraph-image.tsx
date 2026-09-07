import { ImageResponse } from "next/og";
import { getTajawalBold } from "@/lib/og-font";
import { ArabicText } from "@/lib/coupon-og";

// صورة OG افتراضية على مستوى الموقع كامل — تُستخدم تلقائيًا لأي صفحة ما
// بتحدد ogImage خاص فيها (التصنيفات، الصفحات الثابتة، الرئيسية).
export const alt = "كوبون نور — وفر أكثر مع أفضل أكواد الخصم";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const tajawalBold = await getTajawalBold();

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
              background: "#CD3018",
              color: "#ffffff",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            %
          </div>
          <ArabicText text="كوبون نور" style={{ fontFamily: "Tajawal", color: "#ffffff", fontSize: 64, fontWeight: 700 }} />
        </div>
        <ArabicText
          text="أكواد خصم موثّقة وعروض محدّثة يوميًا"
          style={{ marginTop: 28, fontFamily: "Tajawal", color: "rgba(255,255,255,0.7)", fontSize: 30 }}
        />
      </div>
    ),
    { ...size, fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })) }
  );
}
