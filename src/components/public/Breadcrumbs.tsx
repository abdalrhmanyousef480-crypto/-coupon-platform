import Link from "next/link";

/** Shared breadcrumb trail — subtle hover state on links, full-contrast
 *  current-page crumb, muted "‹" separators. Used across detail pages. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-muted mb-5">
      <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-ink-faint">‹</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-primary transition-colors">{item.label}</Link>
          ) : (
            <span aria-current="page" className="text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
