import Link from "next/link";
import { Plus } from "lucide-react";

export function AdminPageHeader({
  title, count, newHref, newLabel,
}: { title: string; count?: number; newHref?: string; newLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2.5">
        {title}
        {typeof count === "number" && (
          <span className="badge-neutral text-[13px] font-semibold">{count}</span>
        )}
      </h1>
      {newHref && (
        <Link href={newHref} className="btn-primary btn-sm">
          <Plus className="h-4 w-4" /> {newLabel}
        </Link>
      )}
    </div>
  );
}
