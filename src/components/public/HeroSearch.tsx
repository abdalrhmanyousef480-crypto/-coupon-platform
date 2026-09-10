"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, Store as StoreIcon, Percent } from "lucide-react";
import { searchSuggestions, type PublicSearchSuggestion } from "@/lib/search";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PublicSearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestQueryRef = useRef("");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    latestQueryRef.current = value;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setHasSearched(false);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchSuggestions(trimmed).then((results) => {
        if (latestQueryRef.current.trim() === trimmed) {
          setSuggestions(results);
          setHasSearched(true);
          setIsOpen(true);
        }
      });
    }, DEBOUNCE_MS);
  }

  function handleClear() {
    setQuery("");
    setSuggestions([]);
    setHasSearched(false);
    setIsOpen(false);
    latestQueryRef.current = "";
  }

  return (
    <div ref={containerRef} className="relative mx-auto max-w-xl">
      <form action="/coupons">
        <div className="flex items-center gap-3 rounded-full border-2 border-border-strong bg-surface py-2.5 ps-6 pe-2.5 shadow-lg transition-all duration-300 focus-within:border-accent/40 focus-within:shadow-[0_20px_48px_rgba(20,33,61,0.14)]">
          <Search className="h-5 w-5 shrink-0 text-ink-faint" />
          <input
            name="q"
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
            onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
            placeholder="ابحث عن متجر أو كوبون..."
            autoComplete="off"
            className="min-w-0 flex-1 border-none bg-transparent text-[15.5px] outline-none"
          />
          {query && (
            <button type="button" onClick={handleClear} className="icon-btn-sm shrink-0" title="مسح البحث">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="submit" className="btn-primary btn-lg rounded-full shrink-0">بحث</button>
        </div>
      </form>

      {isOpen && (
        <div className="absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {suggestions.length > 0 ? (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {suggestions.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-alt"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        item.type === "store" ? "bg-primary/10 text-primary" : "bg-accent-soft text-accent"
                      }`}
                    >
                      {item.type === "store" ? <StoreIcon className="h-4 w-4" /> : <Percent className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{item.title}</span>
                      <span className="block truncate text-xs text-ink-faint">{item.subtitle}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            hasSearched && <p className="px-5 py-6 text-center text-sm text-ink-muted">لا توجد نتائج مطابقة.</p>
          )}
        </div>
      )}
    </div>
  );
}
