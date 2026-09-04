import { ImageResponse } from "next/og";
import { getTajawalBold } from "@/lib/og-font";

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
          <div style={{ display: "flex", fontFamily: "Tajawal", color: "#ffffff", fontSize: 64, fontWeight: 700 }}>
            كوبون نور
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: "Tajawal", marginTop: 28, color: "rgba(255,255,255,0.7)", fontSize: 30 }}>
          أكواد خصم موثّقة وعروض محدّثة يوميًا
        </div>
      </div>
    ),
    { ...size, fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })) }
  );
}
