"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n";

export function SiteHeader({ locale, premium = false }: { locale: Locale; premium?: boolean }) {
  const t = getTranslator(locale);
  const prefix = locale === "en" ? "/en" : "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const desktopClass = premium ? "hidden xl:flex" : "hidden md:flex";
  const mobileClass = premium ? "xl:hidden" : "md:hidden";

  const navItems = [
    { href: prefix || "/", label: t("nav.home") },
    { href: `${prefix}/coupons`, label: t("nav.coupons") },
    { href: `${prefix}/stores`, label: t("nav.stores") },
    { href: `${prefix}/categories`, label: t("nav.categories") },
    { href: `${prefix}/blog`, label: t("nav.blog") },
    { href: `${prefix}/about`, label: t("nav.about") },
  ];

  const mobileNavItems = [
    { href: prefix || "/", label: t("nav.home") },
    { href: `${prefix}/stores`, label: t("nav.stores") },
    { href: `${prefix}/coupons`, label: t("nav.coupons") },
    { href: `${prefix}/categories`, label: t("nav.categories") },
    { href: `${prefix}/about`, label: t("nav.about") },
    { href: `${prefix}/contact`, label: t("nav.contact") },
  ];

  

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuRef.current;
    const desktop = matchMedia(premium ? "(min-width: 1280px)" : "(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    drawerRef.current?.querySelector<HTMLElement>("a, button, input")?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.key !== "Tab") return;
      const items = drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button, input");
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileOpen, premium]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-container mx-auto px-5 md:px-8 h-[72px] flex items-center gap-6">
          <Link href={prefix || "/"} className="flex items-center gap-2 font-display font-extrabold text-xl text-primary shrink-0">
            <span className="w-[34px] h-[34px] rounded-md bg-primary text-white flex items-center justify-center text-base">%</span>
            {t("site.name")}
          </Link>

          <nav className={`${desktopClass} items-center gap-1 flex-1`} aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="px-3.5 py-2 rounded-full text-[14.5px] font-medium hover:bg-surface-alt hover:text-primary transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 ms-auto">
            <form
              action={`${prefix}/coupons`}
              className={`${desktopClass} items-center gap-2 px-4 py-2 rounded-full border border-border-strong text-ink-muted text-sm min-w-[200px] focus-within:border-ink-faint transition-colors`}
            >
              <button
                type="submit"
                aria-label={locale === "ar" ? "بحث" : "Search"}
                className="shrink-0 hover:text-primary transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
              <input
                type="text"
                name="q"
                placeholder={t("search.placeholder")}
                aria-label={t("search.placeholder")}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-ink placeholder:text-ink-muted"
              />
            </form>
          
            <button
              ref={menuRef}
              onClick={() => setMobileOpen(true)}
              className={`${mobileClass} w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-alt transition-colors`}
              aria-label={locale === "ar" ? "القائمة" : "Menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay — sits outside <header> so its own stacking
          context isn't affected by the header's backdrop-blur */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-ink/60 transition-opacity duration-300 ${mobileClass} ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile nav drawer */}
      <div
        ref={drawerRef}
        inert={!mobileOpen}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={locale === "ar" ? "القائمة" : "Menu"}
        className={`fixed inset-y-0 start-0 z-[60] w-[82%] max-w-[320px] flex flex-col bg-surface shadow-lg transition-transform duration-300 ease-in-out ${mobileClass} ${
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-[72px] px-5 border-b border-border shrink-0">
          <Link
            href={prefix || "/"}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 font-display font-extrabold text-xl text-primary"
          >
            <span className="w-[34px] h-[34px] rounded-md bg-primary text-white flex items-center justify-center text-base">%</span>
            {t("site.name")}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-11 h-11 flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-alt hover:text-ink transition-colors"
            aria-label={locale === "ar" ? "إغلاق" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col p-5 gap-1.5 overflow-y-auto" aria-label="Mobile">
          {mobileNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3.5 rounded-xl text-[15px] font-medium text-ink hover:bg-surface-alt hover:text-primary active:bg-surface-alt transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-5 border-t border-border shrink-0">
          <form
            action={`${prefix}/coupons`}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full border border-border-strong bg-surface focus-within:border-primary transition-colors"
          >
            <button
              type="submit"
              aria-label={locale === "ar" ? "بحث" : "Search"}
              className="shrink-0 text-ink-muted hover:text-primary transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
            <input
              type="text"
              name="q"
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-ink-muted"
            />
          </form>
        </div>
      </div>
    </>
  );
}
