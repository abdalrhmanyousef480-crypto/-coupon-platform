import { z } from "zod";

// ============================================================
// معلومات التسوق لكل متجر (شحن، استرجاع، دفع، أقسام، مميزات، أسئلة)
// مخزّنة بعمود stores."storeInfo" (jsonb) وقابلة للتعديل من لوحة التحكم.
// قاعدة المحتوى: معلومات منقولة من موقع المتجر الرسمي فقط — أي حقل ما
// له مصدر يُترك فاضيًا ولا يظهر بالصفحة (بدون تأليف أو تخمين).
// ============================================================

const text = z.string().trim().max(600).optional().default("");

export const storeInfoSchema = z.object({
  shipping: text,
  returns: text,
  payment: text,
  products: text,
  highlights: z.array(z.string().trim().min(1).max(160)).max(6).default([]),
  faq: z.array(z.object({
    question: z.string().trim().min(3).max(200),
    answer: z.string().trim().min(3).max(500),
  })).max(8).default([]),
  sources: z.array(z.object({
    label: z.string().trim().min(1).max(120),
    url: z.string().trim().url().refine((u) => /^https?:\/\//.test(u), "رابط غير صالح"),
  })).max(8).default([]),
  /** مدة الاسترجاع بالأيام كما يذكرها المتجر (لـ JSON-LD فقط)؛ فاضي = غير مذكورة. */
  returnDays: z.number().int().min(0).max(365).nullable().optional().default(null),
  /** تاريخ آخر مراجعة للمعلومات من موقع المتجر (YYYY-MM-DD). */
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().default(null),
});

export type StoreInfo = z.infer<typeof storeInfoSchema>;

/** يقرأ قيمة العمود بأمان: أي بيانات تالفة = لا شيء يظهر بدل ما تنكسر الصفحة. */
export function parseStoreInfo(value: unknown): StoreInfo | null {
  if (!value || typeof value !== "object") return null;
  const parsed = storeInfoSchema.safeParse(value);
  if (!parsed.success) return null;
  return hasStoreInfo(parsed.data) ? parsed.data : null;
}

export function hasStoreInfo(info: StoreInfo): boolean {
  return Boolean(info.shipping || info.returns || info.payment || info.products || info.highlights.length || info.faq.length);
}

// ---------- تحويل نص لوحة التحكم ⇄ بيانات منظمة ----------
// الأسئلة: كل سؤال وجوابه سطرين متتاليين، وبين كل سؤال والتاني سطر فاضي.
// المصادر: سطر لكل مصدر «العنوان | الرابط». المميزات: سطر لكل ميزة.

export function faqToText(faq: StoreInfo["faq"]): string {
  return faq.map((f) => `${f.question}\n${f.answer}`).join("\n\n");
}

export function textToFaq(value: string): StoreInfo["faq"] {
  return value.split(/\n\s*\n/).map((block) => block.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length >= 2)
    .map(([question, ...rest]) => ({ question, answer: rest.join(" ") }));
}

export function sourcesToText(sources: StoreInfo["sources"]): string {
  return sources.map((s) => `${s.label} | ${s.url}`).join("\n");
}

export function textToSources(value: string): StoreInfo["sources"] {
  return value.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const i = line.lastIndexOf("|");
    return i === -1 ? { label: line, url: line } : { label: line.slice(0, i).trim(), url: line.slice(i + 1).trim() };
  });
}

export function linesToList(value: string): string[] {
  return value.split("\n").map((l) => l.trim()).filter(Boolean);
}
