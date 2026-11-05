"use client";

// Instant feedback when an internal link is tapped: a thin accent bar at the
// top until the next page arrives. It lives outside the page tree, so the
// server HTML of every page stays exactly the same (unlike loading.tsx, which
// would stream page content inside a hidden block).
// It also prefetches a link on first touch/hover: store cards turn automatic
// prefetch off (too many requests on big grids), so this gives the tapped one
// a head start without the mass prefetching.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function internalHref(target: EventTarget | null): string | null {
  const a = (target as Element | null)?.closest?.("a");
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return null;
  const href = a.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export function NavProgress() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const prefetched = useRef(new Set<string>());

  useEffect(() => setActive(false), [pathname]);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => setActive(false), 12000);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    const warm = (e: Event) => {
      const href = internalHref(e.target);
      if (!href || href.startsWith("/admin") || prefetched.current.has(href)) return;
      prefetched.current.add(href);
      router.prefetch(href);
    };
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = internalHref(e.target);
      if (!href || href.split("?")[0] === window.location.pathname) return;
      setActive(true);
    };
    document.addEventListener("touchstart", warm, { passive: true });
    document.addEventListener("mouseover", warm, { passive: true });
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("touchstart", warm);
      document.removeEventListener("mouseover", warm);
      document.removeEventListener("click", click);
    };
  }, [router]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden">
      <div className={active ? "nav-progress h-full bg-accent" : "hidden"} />
    </div>
  );
}
