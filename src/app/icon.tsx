import { ImageResponse } from "next/og";

// أيقونة الموقع (favicon) — نفس علامة "%" الملاحية المستخدمة بالهيدر
// والفوتر ولوحة التحكم، مولّدة بنفس آلية next/og (بدون ملف صورة ثابت).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14213D",
          borderRadius: 7,
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        %
      </div>
    ),
    { ...size }
  );
}
