import type { LucideIcon } from "lucide-react";

/** Icon tile + bold heading + small accent underline — the premium section
 *  header treatment shared by the store and coupon detail pages. */
export function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-7 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/15">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-primary md:text-2xl">{children}</h2>
        <span aria-hidden="true" className="mt-1.5 block h-[3px] w-9 rounded-full bg-gradient-to-r from-accent to-accent-hover" />
      </div>
    </div>
  );
}
