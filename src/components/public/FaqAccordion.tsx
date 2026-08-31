import { Plus } from "lucide-react";

/** Premium accordion group shared by the store and coupon detail pages —
 *  bordered card, divided rows, and a Plus icon that rotates/tints on open. */
export function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {items.map((item, i) => (
        <details key={i} className="group px-5 open:bg-surface-alt/40 md:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-primary transition-colors hover:text-accent">
            {item.question}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-ink-muted transition-all duration-300 ease-out group-open:rotate-45 group-open:bg-accent-soft group-open:text-accent">
              <Plus className="h-4 w-4" />
            </span>
          </summary>
          <p className="pb-5 text-sm leading-relaxed text-ink-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
