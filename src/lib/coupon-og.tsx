import type { CSSProperties } from "react";
import sharp from "sharp";

// عناصر مشتركة بين صورة OG الرسمية (opengraph-image.tsx) ونسخ الاختبار
// التجريبية (زي preview-image لمتجر واحد قبل التعميم) — نفس الألوان
// والزخارف بمكان واحد بدل التكرار.
export const NAVY = "#14213D";
export const NAVY_SOFT = "#8D95B3"; // درجة كحلي فاتحة لزخارف الشفرون الثانوية
export const CORAL = "#CD3018";
export const SURFACE_ALT = "#F4F3EF";
export const BORDER = "#E7E5E0";
export const INK_MUTED = "#686F7D";

// Satori (محرّك next/og) ما بيقدر يفك ترميز WebP لعناصر <img> — وشعارات
// المتاجر المرفوعة عبر لوحة التحكم مخزّنة كـ WebP (راجع store-logos بـ
// Supabase). لازم نحوّلها PNG بالذاكرة عبر sharp (متوفرة أصلًا كـ dependency
// لمعالجة رفع الشعارات، راجع src/lib/actions-upload.ts).
export async function logoToPngDataUri(url: string): Promise<string | null> {
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
export function Sparkle({ mirror = false, scale = 1 }: { mirror?: boolean; scale?: number }) {
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

// Satori ما بيطبّق Unicode Bidi على مستوى الجملة (بيشكّل حروف كل كلمة
// عربية صح لحالها، لكن ما بيعكس ترتيب الكلمات المفصولة بمسافة زي أي
// محرك متصفح حقيقي) — فبتصير كلمات الجملة العربية بترتيب معكوس بصريًا
// حتى لو كل كلمة لحالها مكتوبة صح. الحل: نقسم النص لكلمات ونعرضها
// بصف flex معكوس (row-reverse) يدويًا، فتترتب بصريًا صح بدون ما نلمس
// النص المصدر أو الخط.
export function ArabicText({
  text,
  style,
}: {
  text: string;
  style?: CSSProperties;
}) {
  const words = text.trim().split(/\s+/);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.18em",
        ...style,
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{ display: "flex" }}>
          {w}
        </span>
      ))}
    </div>
  );
}

export function CopyIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "flex" }}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M16 8V6.5C16 5.67157 15.3284 5 14.5 5H6.5C5.67157 5 5 5.67157 5 6.5V14.5C5 15.3284 5.67157 16 6.5 16H8" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  );
}
