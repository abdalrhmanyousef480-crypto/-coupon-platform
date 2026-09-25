import { db } from "@/lib/db";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

// llms.txt — ملف تكميلي (مو معيار Google الرسمي، ولا هو robots.txt/sitemap.xml)
// لمساعدة أدوات الزحف المعتمدة على نماذج اللغة (ChatGPT/Perplexity/...) على
// فهم بنية الموقع بسرعة. راوت ديناميكي (مجلد اسمه حرفيًا "llms.txt" فـ
// المسار النهائي يطابق الاسم) بدل ملف ثابت بـ public/ عشان الأعداد تحت
// حقيقية من قاعدة البيانات مباشرة (نفس فلسفة sitemap.ts/robots.ts
// الديناميكية بالمشروع) — ما فيه أي رقم أو ادّعاء مختلق.
export const revalidate = 3600;

export async function GET() {
  const [storeCount, couponCount, categoryCount] = await Promise.all([
    db.store.count({ where: { isPublished: true, noindex: false } }),
    // store.isPublished/noindex كمان — toggleStorePublish ما بيلمس
    // Coupon.isPublished/noindex بتاع كوبونات المتجر، فبدون هالشرط الرقم
    // هون كان يشمل كوبونات متاجر اتلغى نشرها (نفس فجوة commit d43acab)،
    // وهذا يناقض ادّعاء الملف نفسه إن الأعداد "حقيقية ومُحدَّثة من قاعدة
    // البيانات مباشرة".
    db.coupon.count({ where: { isPublished: true, noindex: false, store: { isPublished: true, noindex: false } } }),
    db.category.count({ where: { isPublished: true, noindex: false } }),
  ]);

  const body = `# ${SITE_NAME.ar}

> منصة عربية لأكواد الخصم والعروض في السعودية. نجمع كوبونات من متاجر إلكترونية متعددة ونراجعها بانتظام.

الموقع: ${SITE_URL}
اللغة: العربية (RTL) فقط — لا توجد نسخة إنجليزية حاليًا.

## الأقسام الرئيسية

- ${SITE_URL}/stores — قائمة المتاجر المتوفرة (${storeCount} متجر منشور حاليًا).
- ${SITE_URL}/coupons — جميع أكواد الخصم والعروض (${couponCount} كوبون منشور حاليًا).
- ${SITE_URL}/categories — تصنيفات المتاجر حسب النوع (${categoryCount} تصنيف منشور).
- ${SITE_URL}/blog — مقالات ونصائح تسوق وخصومات.

## المصداقية والمنهجية

- ${SITE_URL}/coupon-verification-policy — كيف نتحقق فعليًا من صلاحية أكواد الخصم قبل نشرها.
- ${SITE_URL}/editorial-policy — سياسة التحرير ومعايير اختيار المتاجر والعروض.
- ${SITE_URL}/affiliate-disclosure — إفصاح العلاقة مع المتاجر (روابط أفلييت).

## ملاحظة

هذا الملف تكميلي فقط، وليس بديلًا عن sitemap.xml أو robots.txt. الأعداد أعلاه حقيقية ومُحدَّثة من قاعدة البيانات مباشرة (كل ساعة).
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
