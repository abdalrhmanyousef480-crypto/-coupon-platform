import Link from "next/link";
import { ListTree } from "lucide-react";

/** جدول محتويات بسيط — روابط <a href="#id"> حقيقية لعناوين H2 فعلية
 *  بالصفحة (نفس id المستخدم بـ GuideSection). لا مكتبات خارجية، لا
 *  scroll-spy — بس تنقّل مباشر. sticky بس على الشاشات الكبيرة
 *  (lg:sticky) عشان ما يزاحم المحتوى على الموبايل. */
export function GuideTOC({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="جدول محتويات الدليل"
      className="rounded-xl border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-24"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
        <ListTree className="h-4 w-4 text-accent" />
        محتويات الدليل
      </div>
      <ol className="space-y-1 text-[13.5px]">
        {items.map((item, i) => (
          <li key={item.id}>
            <Link
              href={`#${item.id}`}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-ink-muted transition-colors hover:bg-surface-alt hover:text-accent"
            >
              <span className="mt-0.5 shrink-0 text-ink-faint">{i + 1}.</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
