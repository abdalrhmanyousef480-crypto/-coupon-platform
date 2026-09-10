import type { GuideQuickFact } from "@/lib/guides/types";

/** شبكة معلومات سريعة — فقط حقائق تم التحقق منها فعليًا (راجع مصدر كل
 *  دليل بملف بياناته)، بدون أي رقم/ادعاء غير موثّق. */
export function GuideQuickFacts({ facts }: { facts: GuideQuickFact[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {facts.map((fact, i) => {
        const Icon = fact.icon;
        return (
          <div key={i} className="rounded-xl border border-border bg-surface-alt/60 p-4 text-center">
            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{fact.label}</p>
            <p className="mt-1 text-[13px] font-bold leading-snug text-primary">{fact.value}</p>
          </div>
        );
      })}
    </div>
  );
}
