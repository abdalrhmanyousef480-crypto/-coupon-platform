import { Gift, Percent, ShoppingBag } from "lucide-react";

/**
 * Purely decorative illustration cluster for the homepage Hero's right side —
 * a stylized coupon/notebook card with a shopping bag and gift box behind it,
 * approximating the approved visual reference. No copy/text is embedded here;
 * the only glyph reused is the site's existing "%" brand mark.
 */
export function HeroVisual({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative aspect-[4/5] ${className}`}>
      {/* soft halo behind the cluster */}
      <div className="absolute inset-[6%] rounded-full bg-accent-soft/80 blur-3xl" />

      {/* podium — sits behind everything as the base the cluster rests on */}
      <div className="absolute bottom-[10%] left-1/2 z-0 h-14 w-[68%] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-accent-soft to-surface shadow-md sm:h-16" />

      {/* gift box, upper right, tucked behind the card */}
      <div className="absolute right-[10%] top-[4%] z-10 flex h-[26%] w-[26%] rotate-[12deg] items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft to-surface shadow-lg">
        <Gift className="h-2/5 w-2/5 text-accent" strokeWidth={1.75} />
      </div>

      {/* shopping bag, left, tucked behind the card */}
      <div className="absolute -left-[2%] top-[8%] z-10 flex h-[28%] w-[28%] -rotate-[9deg] items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft to-surface shadow-lg">
        <ShoppingBag className="h-2/5 w-2/5 text-primary" strokeWidth={1.75} />
      </div>

      {/* ticket / notebook card — the front-most, dominant element */}
      <div className="absolute inset-x-[6%] top-[32%] z-20 -rotate-[5deg] rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center justify-between gap-1.5 border-r border-dashed border-border-strong pr-3">
            <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
            <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
          </div>
          <div className="flex-1 space-y-2.5 py-1">
            <span className="block h-2 w-full rounded-full bg-border" />
            <span className="block h-2 w-[80%] rounded-full bg-border" />
            <span className="block h-2 w-[60%] rounded-full bg-accent-soft" />
          </div>
        </div>
      </div>

      {/* "%" badge, overlapping the card's bottom-right corner — front-most */}
      <div className="absolute bottom-[16%] right-[4%] z-30 flex h-[22%] w-[22%] items-center justify-center rounded-full bg-accent shadow-lg ring-4 ring-surface">
        <Percent className="h-2/5 w-2/5 text-white" strokeWidth={2.25} />
      </div>
    </div>
  );
}
