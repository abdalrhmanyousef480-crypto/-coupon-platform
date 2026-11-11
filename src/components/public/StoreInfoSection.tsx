import { Truck, RotateCcw, CreditCard, ShoppingBag, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StoreInfo } from "@/lib/store-info";
import { formatDate } from "@/lib/utils";

/**
 * Shopping info from the merchant's official site, under the codes: compact
 * cards (icon + two sentences) and a short "why" list. Empty fields are not
 * rendered. The store's own FAQ lives in the page's single FAQ section.
 */
export function StoreInfoSection({ info, brand }: { info: StoreInfo; brand: string }) {
  const cards: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: Truck, title: "الشحن والتوصيل", body: info.shipping },
    { icon: RotateCcw, title: "الاسترجاع والاستبدال", body: info.returns },
    { icon: CreditCard, title: "طرق الدفع", body: info.payment },
    { icon: ShoppingBag, title: "أشهر الأقسام", body: info.products },
  ].filter((c) => c.body);
  if (cards.length === 0 && info.highlights.length === 0) return null;

  return (
    <section aria-labelledby="store-info" className="rounded-lg border border-border bg-surface p-4 shadow-sm md:p-6">
      <h2 id="store-info" className="text-xl font-extrabold text-primary md:text-2xl">معلومات التسوق من {brand}</h2>

      {cards.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {cards.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3 rounded-md border border-border bg-bg p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-extrabold text-primary">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/85">{body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {info.highlights.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[15px] font-extrabold text-primary">لماذا {brand}؟</h3>
          <ul className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {info.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm leading-relaxed text-ink/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(info.checkedAt || info.sources.length > 0) && (
        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-ink-muted">
          {info.checkedAt && <>المعلومات من موقع {brand} الرسمي · آخر مراجعة {formatDate(new Date(`${info.checkedAt}T12:00:00Z`), "ar")}</>}
          {info.sources.length > 0 && (
            <>
              {info.checkedAt && " · "}المصدر:{" "}
              {info.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && "، "}
                  <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="underline-offset-2 hover:text-primary hover:underline">{s.label}</a>
                </span>
              ))}
            </>
          )}
        </p>
      )}
    </section>
  );
}
