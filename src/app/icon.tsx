import { ImageResponse } from "next/og";

// أيقونة الموقع (favicon) — نفس علامة "%" الملاحية المستخدمة بالهيدر
// والفوتر ولوحة التحكم، مولّدة بنفس آلية next/og (بدون ملف صورة ثابت).
// 48×48 عمدًا (مو 32×32 القديم) — جوجل بتوثيقها الرسمي لصور الفافيكون
// بمحرك البحث بتطلب مقاس "multiple of 48px" كحد أدنى، و32px تحته.
// نفس الصورة بالضبط (نفس البايتات، مأخوذة من هالراوت) محفوظة كملف
// ثابت بـ src/app/favicon.ico عشان المسار الكلاسيكي /favicon.ico
// (اللي جوجل والمتصفحات بتتحقق منه مباشرة بغض النظر عن <link
// rel="icon">) يرجّع نفس الأيقونة بدل 404 — Next.js ما بيدعم توليد
// ديناميكي لـ /favicon.ico نفسه (فقط لـ /icon و/apple-icon)، فلازم
// ملف ثابت هناك تحديدًا.
export const size = { width: 48, height: 48 };
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
          borderRadius: 10,
          color: "#ffffff",
          fontSize: 30,
          fontWeight: 800,
        }}
      >
        %
      </div>
    ),
    { ...size }
  );
}
