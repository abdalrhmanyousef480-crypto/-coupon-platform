export function MerchantReferences({ sources }: { sources: { label: string; url: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <nav aria-label="مصادر المتجر الرسمية" className="mt-4 border-t border-border pt-4">
      <p className="text-xs leading-relaxed text-ink-muted">راجع التفاصيل الحالية لدى المتجر قبل إتمام الطلب:</p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4 hover:text-accent">
              {source.label}<span className="sr-only"> (يفتح في علامة تبويب جديدة)</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
