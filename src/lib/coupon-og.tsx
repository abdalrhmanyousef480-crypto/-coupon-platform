import type { CSSProperties } from "react";
import sharp from "sharp";

export const NAVY = "#14213D";
export const NAVY_SOFT = "#8D95B3";
export const CORAL = "#CD3018";
export const SURFACE_ALT = "#F4F3EF";
export const BORDER = "#E7E5E0";
export const INK_MUTED = "#686F7D";

// Satori (محرك next/og) لا يتعامل مع WebP داخل <img>
// لذلك نحول شعارات المتاجر إلى PNG في الذاكرة.
export async function logoToPngDataUri(
  url: string
): Promise<string | null> {
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

// زخرفة الشفرون المزدوجة.
export function Sparkle({
  mirror = false,
  scale = 1,
}: {
  mirror?: boolean;
  scale?: number;
}) {
  const dir = mirror ? -1 : 1;

  const bigW = 30 * scale;
  const bigH = 7 * scale;
  const smallW = 19 * scale;
  const smallH = 5 * scale;

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 46 * scale,
        height: 36 * scale,
      }}
    >
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

// Satori لا يطبق ترتيب الكلمات العربية بشكل صحيح على مستوى الجملة.
// لذلك نقسم النص إلى كلمات ونرتبها يدويًا.
export function ArabicText({
  text,
  style,
  widths,
}: {
  text: string;
  style?: CSSProperties;
  widths?: number[];
}) {
  const words = text.trim().split(/\s+/);

  const fontSize =
    typeof style?.fontSize === "number" ? style.fontSize : 24;

  const gap = Math.round(fontSize * (widths ? 0.3 : 0.22));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "center",
        gap,
        ...(widths
          ? {
              flexWrap: "wrap" as const,
              rowGap: Math.round(fontSize * 0.1),
            }
          : {}),
        ...style,
      }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          style={
            widths?.[index]
              ? {
                  display: "flex",
                  width: widths[index],
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }
              : {
                  display: "flex",
                }
          }
        >
          {word}
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// توافق مع card-image و opengraph-image.
//
// مهم:
// هذه الدوال موجودة لأن ملفات الصور تستعملها.
// لكننا لا ننشئ ImageResponse إضافية لكل كلمة، ولا نستخدم Sharp
// لفحص البكسلات. هذا يجعل توليد الصورة أخف بكثير.
// ------------------------------------------------------------

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 700;
  style: "normal";
};

/**
 * تحويل بيانات خط Tajawal إلى الصيغة التي تتوقعها ImageResponse.
 */
export function tajawalOgFonts(
  buffers: ArrayBuffer[]
): OgFont[] {
  return buffers.map((data) => ({
    name: "Tajawal",
    data,
    weight: 700,
    style: "normal",
  }));
}

/**
 * حساب تقريبي لعرض الكلمات.
 *
 * النسخة السابقة كانت تنشئ ImageResponse منفصلة لكل كلمة
 * ثم تحولها إلى Buffer باستخدام Sharp وتفحص البكسلات.
 *
 * هذا كان مكلفًا جدًا لمسار توليد صور الكوبونات.
 *
 * الآن نستخدم تقديرًا رياضيًا بسيطًا بدل إعادة رسم الصورة.
 */
export function measureWordWidths(
  text: string,
  fontSize: number,
  _fonts: OgFont[]
): Promise<number[]> {
  const words = text.trim().split(/\s+/);

  const widths = words.map((word) => {
    const estimatedWidth =
      word.length * fontSize * 0.62;

    return Math.max(
      Math.ceil(fontSize * 0.6),
      Math.ceil(estimatedWidth)
    );
  });

  return Promise.resolve(widths);
}

export function CopyIcon({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "flex" }}
    >
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2.5"
        stroke="#FFFFFF"
        strokeWidth="2"
      />

      <path
        d="M16 8V6.5C16 5.67157 15.3284 5 14.5 5H6.5C5.67157 5 5 5.67157 5 6.5V14.5C5 15.3284 5.67157 16 6.5 16H8"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
    </svg>
  );
}
