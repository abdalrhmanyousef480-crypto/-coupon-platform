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
    // A slow merchant logo must never stall the entire generated image.
    // Uploaded logo URLs are content-addressed, so shared fetch cache is safe.
    const res = await fetch(url, { cache: "force-cache", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 4_000_000) return null;
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
// لذلك نقسم النص إلى قطع (كلمات) ونرتبها يدويًا (row-reverse).
//
// الكلمات اللاتينية المتتالية (مثل "option b" في "اوبشن بي | option b")
// تُجمع في قطعة واحدة بترتيبها الأصلي حتى لا تنعكس إلى "b option".
const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_CHAR = /[A-Za-z0-9]/;

export function arabicTokens(text: string): string[] {
  const tokens: string[] = [];
  let latinRun: string[] = [];
  const flush = () => {
    if (latinRun.length) tokens.push(latinRun.join(" "));
    latinRun = [];
  };
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue;
    if (!ARABIC_CHAR.test(word) && LATIN_CHAR.test(word)) {
      latinRun.push(word);
    } else {
      flush();
      tokens.push(word);
    }
  }
  flush();
  return tokens;
}

/** حدود الحبر الفعلي لقطعة نص: x0 = بداية الحبر داخل صندوق Satori، width = عرض الحبر. */
export type WordBox = { x0: number; width: number };

export function ArabicText({
  text,
  style,
  widths,
}: {
  text: string;
  style?: CSSProperties;
  /** من measureWordWidths — بدونها تُستخدم عروض Satori الطبيعية. */
  widths?: WordBox[];
}) {
  const tokens = arabicTokens(text);

  const fontSize =
    typeof style?.fontSize === "number" ? style.fontSize : 24;

  // مع عروض الحبر المقاسة، المسافة بين الكلمات هي المسافة المرئية بالضبط.
  const gap = Math.round(fontSize * (widths ? 0.26 : 0.22));

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
      {tokens.map((token, index) => {
        const box = widths?.[index];
        return box ? (
          <span
            key={index}
            style={{
              display: "flex",
              width: box.width,
              flexShrink: 0,
              overflow: "visible",
            }}
          >
            <span style={{ display: "flex", marginLeft: -box.x0, whiteSpace: "nowrap" }}>
              {token}
            </span>
          </span>
        ) : (
          <span key={index} style={{ display: "flex", whiteSpace: "nowrap" }}>
            {token}
          </span>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// توافق مع card-image و opengraph-image.
//
// القياس يرسم صورة صغيرة واحدة لكل نص (مو لكل كلمة) ويخزن النتيجة بالذاكرة.
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
 * قياس عرض الحبر الحقيقي لكل كلمة.
 *
 * Satori يحسب صندوق الكلمة العربية أعرض من شكلها المتصل الفعلي، فيظهر فراغ
 * زائد بين الكلمات. التقدير بعدد الحروف كان أسوأ (كلمة "الكود" تأخذ عرض
 * 5 حروف منفصلة). الحل: نرسم كل الكلمات مرة واحدة في صورة صغيرة واحدة
 * (كل كلمة بسطر) ونمسح البكسلات لنعرف أين يبدأ الحبر وأين ينتهي.
 *
 * - صورة واحدة لكل نص (مو صورة لكل كلمة).
 * - النتيجة تُحفظ بالذاكرة لكل (حجم الخط + الكلمة)، فالعبارات الثابتة
 *   ("كود الخصم"، "استخدم الكود عند الدفع") تُقاس مرة واحدة فقط لكل instance.
 * - أي فشل يرجع لعروض Satori الطبيعية بدل ما يكسر الصورة.
 */
const wordBoxCache = new Map<string, WordBox>();

export async function measureWordWidths(
  text: string,
  fontSize: number,
  fonts: OgFont[]
): Promise<WordBox[] | undefined> {
  const tokens = arabicTokens(text);
  if (!tokens.length) return undefined;

  const key = (t: string) => `${fontSize}:${t}`;
  const missing = [...new Set(tokens.filter((t) => !wordBoxCache.has(key(t))))];

  if (missing.length) {
    try {
      const { ImageResponse } = await import("next/og");
      const pad = Math.ceil(fontSize * 0.5);
      const rowH = Math.ceil(fontSize * 1.8);
      const longest = Math.max(...missing.map((t) => t.length));
      const width = Math.min(2000, Math.ceil(longest * fontSize * 1.1) + pad * 2);
      const height = rowH * missing.length;

      const png = await new ImageResponse(
        (
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#FFFFFF" }}>
            {missing.map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: rowH,
                  paddingLeft: pad,
                  fontFamily: "Tajawal",
                  fontSize,
                  fontWeight: 700,
                  color: "#000000",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ display: "flex", whiteSpace: "nowrap" }}>{t}</span>
              </div>
            ))}
          </div>
        ),
        { width, height, fonts }
      ).arrayBuffer();

      const { data, info } = await sharp(Buffer.from(png))
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      missing.forEach((t, i) => {
        let minX = -1;
        let maxX = -1;
        for (let y = i * rowH; y < (i + 1) * rowH && y < info.height; y++) {
          const row = y * info.width * info.channels;
          for (let x = 0; x < info.width; x++) {
            if (data[row + x * info.channels] < 140) {
              if (minX < 0 || x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
        }
        if (minX >= 0) {
          wordBoxCache.set(key(t), { x0: minX - pad, width: maxX - minX + 1 });
        }
      });
    } catch (error) {
      console.error("[coupon-image] measureWordWidths failed, using natural widths:", error);
      return undefined;
    }
  }

  const boxes = tokens.map((t) => wordBoxCache.get(key(t)));
  return boxes.every(Boolean) ? (boxes as WordBox[]) : undefined;
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
