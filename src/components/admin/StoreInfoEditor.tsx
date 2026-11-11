"use client";

import { useState, useTransition } from "react";
import { updateStoreInfo } from "@/lib/actions-store";
import {
  parseStoreInfo, faqToText, textToFaq, sourcesToText, textToSources, linesToList,
} from "@/lib/store-info";

const field = "flex flex-col gap-1.5";
const label = "text-sm font-bold text-ink";
const hint = "text-xs leading-6 text-ink-muted";

/**
 * Store shopping info (shown under the codes on the public page). Only facts
 * from the store's official site — leave a field empty when the site says
 * nothing about it; empty fields are hidden on the page.
 */
export function StoreInfoEditor({ storeId, value }: { storeId: string; value: unknown }) {
  const info = parseStoreInfo(value);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const filled = info ? [info.shipping, info.returns, info.payment, info.products].filter(Boolean).length : 0;

  function onSubmit(form: FormData) {
    const str = (k: string) => String(form.get(k) ?? "").trim();
    const days = str("returnDays");
    const data = {
      shipping: str("shipping"),
      returns: str("returns"),
      payment: str("payment"),
      products: str("products"),
      highlights: linesToList(str("highlights")),
      faq: textToFaq(str("faq")),
      sources: textToSources(str("sources")),
      returnDays: days === "" ? null : Number(days),
      checkedAt: str("checkedAt") || null,
    };
    setMessage(null);
    startTransition(async () => {
      const res = await updateStoreInfo(storeId, data);
      setMessage(res.success ? { ok: true, text: "تم الحفظ — يظهر على صفحة المتجر خلال ثوانٍ." } : { ok: false, text: res.error });
    });
  }

  return (
    <details className="card p-4 sm:p-5">
      <summary className="cursor-pointer text-[15px] font-extrabold text-ink">
        معلومات التسوق (شحن، استرجاع، دفع، أسئلة)
        <span className="ms-2 text-sm font-bold text-ink-muted">{info ? `${filled}/4 بطاقات · ${info.faq.length} أسئلة` : "غير مضافة"}</span>
      </summary>
      <p className={`${hint} mt-2`}>من موقع المتجر الرسمي فقط. الحقل الفاضي ما بيظهر بالصفحة. جملتين لكل بطاقة.</p>

      <form action={onSubmit} className="mt-4 flex flex-col gap-4">
        {([
          ["shipping", "الشحن والتوصيل", info?.shipping],
          ["returns", "الاسترجاع والاستبدال", info?.returns],
          ["payment", "طرق الدفع", info?.payment],
          ["products", "أشهر الأقسام", info?.products],
        ] as const).map(([name, title, v]) => (
          <label key={name} className={field}>
            <span className={label}>{title}</span>
            <textarea name={name} defaultValue={v ?? ""} rows={2} maxLength={600} className="textarea min-h-[72px]" />
          </label>
        ))}

        <label className={field}>
          <span className={label}>مميزات المتجر</span>
          <span className={hint}>سطر لكل ميزة (3–5 نقاط قصيرة).</span>
          <textarea name="highlights" defaultValue={info?.highlights.join("\n") ?? ""} rows={4} className="textarea min-h-[96px]" />
        </label>

        <label className={field}>
          <span className={label}>أسئلة شائعة خاصة بالمتجر</span>
          <span className={hint}>السؤال بسطر والجواب بالسطر اللي بعده، وسطر فاضي بين كل سؤال والتاني. تظهر أول قسم «أسئلة شائعة».</span>
          <textarea name="faq" defaultValue={info ? faqToText(info.faq) : ""} rows={8} className="textarea" />
        </label>

        <label className={field}>
          <span className={label}>المصادر</span>
          <span className={hint}>سطر لكل مصدر: العنوان | الرابط</span>
          <textarea name="sources" defaultValue={info ? sourcesToText(info.sources) : ""} rows={3} dir="auto" className="textarea min-h-[72px]" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={field}>
            <span className={label}>مدة الاسترجاع (أيام)</span>
            <span className={hint}>رقم كما يذكره المتجر، أو فاضي.</span>
            <input name="returnDays" type="number" min={0} max={365} defaultValue={info?.returnDays ?? ""} className="input" />
          </label>
          <label className={field}>
            <span className={label}>تاريخ آخر مراجعة</span>
            <span className={hint}>متى راجعت موقع المتجر.</span>
            <input name="checkedAt" type="date" defaultValue={info?.checkedAt ?? ""} className="input" />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-secondary disabled:opacity-60">{pending ? "جاري الحفظ…" : "حفظ معلومات التسوق"}</button>
          {message && <span role="status" className={`text-sm font-bold ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</span>}
        </div>
      </form>
    </details>
  );
}
