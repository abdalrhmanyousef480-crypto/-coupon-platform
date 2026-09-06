// ============================================================
// خط عربي لصور Open Graph المولّدة (next/og) — Satori (محرّك next/og)
// ما بيدعم العربي افتراضيًا ولا عنده وصول لخطوط النظام، فلازم نمرر
// بيانات الخط (ArrayBuffer) صراحة لـ ImageResponse. نجيب Tajawal (نفس
// خط الموقع العربي، راجع layout.tsx) من Google Fonts وقت الطلب، ونكاشه
// بالذاكرة (module-level) عشان ما نعيد التحميل كل مرة تتولّد فيها صورة.
//
// Satori ما بيدعم WOFF2 (بس TTF/OTF/WOFF) — و Google Fonts الافتراضي
// بيرجّع WOFF2 لأي متصفح حديث. الحل الموثّق: نطلب ملف الـ CSS بـ
// User-Agent قديم (بيرجّع روابط WOFF)، ثم نجيب الخط الفعلي من هذي الروابط.
//
// Google بيرجّع أكثر من @font-face (subset عربي + subset لاتيني —
// أسماء المتاجر عادة مزيج من الاثنين، زي "iHerb - ايهيرب") كل وحدة
// بملف WOFF منفصل يغطي نطاق أحرف مختلف — لازم الاثنين مع بعض عشان
// كل الأحرف (عربي + لاتيني) تترسم صح.
// ============================================================

const fontCache = new Map<string, Promise<ArrayBuffer[]>>();

async function loadGoogleFontWoffs(family: string, weight: number): Promise<ArrayBuffer[]> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
    },
  }).then((res) => res.text());

  const fontUrls = [...css.matchAll(/src: url\(([^)]+)\) format\('woff'\)/g)].map((m) => m[1]);
  if (fontUrls.length === 0) throw new Error(`Could not resolve a WOFF URL for Google Font "${family}" ${weight}`);

  return Promise.all(fontUrls.map((url) => fetch(url).then((res) => res.arrayBuffer())));
}

/** خط Tajawal العريض (700) لعناوين صور OG — كل الـ subsets المتاحة
 *  (عربي + لاتيني)، مكاشة بالذاكرة (آمنة للاستدعاء المتكرر — كل
 *  توليد صورة جديد بيرجّع نفس الـ promise الأول). */
export function getTajawalBold(): Promise<ArrayBuffer[]> {
  const key = "Tajawal:700";
  let promise = fontCache.get(key);
  if (!promise) {
    promise = loadGoogleFontWoffs("Tajawal", 700);
    fontCache.set(key, promise);
  }
  return promise;
}
