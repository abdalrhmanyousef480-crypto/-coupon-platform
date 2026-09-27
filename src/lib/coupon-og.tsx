import type { CSSProperties } from "react";
import sharp from "sharp";
import { ImageResponse } from "next/og";

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
//
// widths (اختياري، من measureWordWidths): Satori بيقيس عرض الكلمة العربية
// أعرض من حروفها المرسومة فعليًا (بيطلع فراغ فاضي جوا صندوق كل كلمة، على
// يمين الحروف — قيس بالبكسل: 15px gap بالكود صارت 64px بالصورة بين "كود"
// و"الخصم"). لما تنمرر، كل كلمة بتاخد عرض حبرها الحقيقي بالضبط، فالـ gap
// بيصير هو الفراغ الوحيد بين الكلمات.
export function ArabicText({
  text,
  style,
  widths,
}: {
  text: string;
  style?: CSSProperties;
  widths?: number[];
}) {
  const words = splitWords(text);
  // الفجوة بين الكلمات لازم تتناسب مع حجم الخط، مو رقم ثابت — نفس
  // المكوّن يُستخدم بأحجام خط مختلفة كتير بنفس الصورة (13px بالفوتر
  // لحد 34px بعنوان "كود الخصم")، ورقم ثابت زي 6px كان يبين ضيق عند
  // 34px وواسع بشكل غير طبيعي عند 13px (حوالي نص حجم الخط). 0.22 من
  // حجم الخط قريب من تباعد الكلمة الطبيعي بالخط العربي.
  const fontSize = typeof style?.fontSize === "number" ? style.fontSize : 24;
  // مع widths (بدون فراغ Satori الزايد) الـ gap هو الفراغ الوحيد، فأوسع
  // شوي ليطابق مسافة الكلمة الطبيعية بـ Tajawal
  const gap = Math.round(fontSize * (widths ? 0.3 : 0.22));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "center",
        gap,
        // بعرض ثابت لكل كلمة ما فيه shrink، فالاسم الطويل يلتف لسطر تاني
        // (row-reverse + wrap = السطر الأول من اليمين، ترتيب قراءة صحيح)
        ...(widths ? { flexWrap: "wrap" as const, rowGap: Math.round(fontSize * 0.1) } : {}),
        ...style,
      }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={widths?.[i] ? { display: "flex", width: widths[i], flexShrink: 0, whiteSpace: "nowrap" } : { display: "flex" }}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/);
}

// ------------------------------------------------------------
// قياس عرض الحبر الحقيقي لكل كلمة: نرسم الكلمة لحالها بنفس Satori ونفس
// الخط/الحجم (فنفس الـ shaping بالضبط متل الصورة النهائية)، ونمسح أعمدة
// البكسل بـ sharp لآخر عمود فيه حبر. Satori بيرسم الحروف من بداية
// (يسار) صندوق الكلمة، والفراغ الزايد كله على يمينها — فعرض الصندوق
// الصحيح = من بدايته لآخر بكسل حبر. بدون أي مكتبة جديدة (next/og وsharp
// موجودين أصلًا). مكاش بالذاكرة لكل (كلمة، حجم)، فالعبارات الثابتة
// ("كود الخصم"، "استخدم الكود عند الدفع") بتنقاس مرة وحدة بس لكل instance.
// ------------------------------------------------------------
export type OgFont = { name: string; data: ArrayBuffer; weight: 700; style: "normal" };

/** بيانات getTajawalBold() بالشكل اللي بيطلبه ImageResponse (fonts). */
export function tajawalOgFonts(buffers: ArrayBuffer[]): OgFont[] {
  return buffers.map((data) => ({ name: "Tajawal", data, weight: 700, style: "normal" }));
}
const inkWidthCache = new Map<string, Promise<number>>();

async function measureInkWidth(word: string, fontSize: number, fonts: OgFont[]): Promise<number> {
  const pad = Math.ceil(fontSize * 0.5);
  const width = Math.ceil(fontSize * (word.length + 2)) + pad * 2;
  const height = Math.ceil(fontSize * 1.8);
  const img = new ImageResponse(
    (
      <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%", paddingLeft: pad, background: "#FFFFFF" }}>
        <span style={{ display: "flex", whiteSpace: "nowrap", fontFamily: "Tajawal", fontSize, fontWeight: 700, color: "#000000" }}>
          {word}
        </span>
      </div>
    ),
    { width, height, fonts }
  );
  const { data, info } = await sharp(Buffer.from(await img.arrayBuffer()))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // آخر عمود فيه أي بكسل غامق (عتبة متساهلة تشمل حواف الـ anti-aliasing)
  for (let x = info.width - 1; x >= 0; x--) {
    for (let y = 0; y < info.height; y++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i] + data[i + 1] + data[i + 2] < 700) return x - pad + 2;
    }
  }
  return 0; // كلمة بلا حبر (مستحيل عمليًا) — 0 = "ما تثبّت عرض" بـ ArabicText
}

/** عروض كلمات النص (بنفس ترتيب ArabicText) لتمريرها كـ widths. */
export function measureWordWidths(text: string, fontSize: number, fonts: OgFont[]): Promise<number[]> {
  return Promise.all(
    splitWords(text).map((word) => {
      const key = `${fontSize}|${word}`;
      let width = inkWidthCache.get(key);
      if (!width) {
        width = measureInkWidth(word, fontSize, fonts);
        // فشل عابر ما لازم يعلق بالكاش للأبد
        width.catch(() => inkWidthCache.delete(key));
        inkWidthCache.set(key, width);
      }
      return width;
    })
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
