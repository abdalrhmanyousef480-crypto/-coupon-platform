"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Form";

export function AdminSearchInput({
  value, onChange, placeholder,
}: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-4">
      <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-ink-faint pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={value ? "ps-9 pe-9" : "ps-9"}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 -translate-y-1/2 end-1.5 icon-btn-sm"
          title="مسح البحث"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
