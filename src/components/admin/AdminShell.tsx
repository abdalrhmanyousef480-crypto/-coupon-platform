"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ExternalLink } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import { SignOutButton } from "@/components/admin/SignOutButton";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

/** غلاف اللوحة بالكامل — نفس نمط القائمة المنسدلة بالموقع العام تمامًا
 *  (راجع SiteHeader.tsx: hidden nav + hamburger + fixed overlay drawer
 *  بالموبايل، عنصر ثابت دائم بالديسكتوب)، مطبّق هون على Sidebar الإدارة:
 *
 *  - بالموبايل (أصغر من md): الـ Sidebar مش موجود بالتخطيط أصلًا (`hidden`)
 *    ما بياخذ أي مساحة. بدلاً عنه Topbar فيه زر همبرغر، وبالضغط عليه تنزلق
 *    نسخة كاملة من الـ Sidebar كـ overlay ثابت (fixed) فوق المحتوى (مش
 *    جنبه) مع خلفية معتمة (backdrop) — الضغط بره الـ drawer أو زر الإغلاق
 *    يسكرها وترجع تختفي بالكامل.
 *  - بالديسكتوب (md فأعلى): Sidebar ثابت بالتخطيط دائمًا، قابل للطي لشريط
 *    أيقونات ضيّق (64px) أو التوسّع الكامل (256px) بزر تبديل داخلي.
 */
export function AdminShell({
  navItems, userEmail, children,
}: { navItems: NavItem[]; userEmail?: string | null; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row" dir="rtl">
      {/* Mobile topbar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-primary text-white shrink-0">
        <Link href="/admin" className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center font-bold text-sm shrink-0">%</span>
          <span className="font-display font-bold truncate">كوبون نور</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-white/10 shrink-0"
          aria-label="فتح القائمة"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-drawer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile overlay backdrop — خارج الـ <header> عشان z-index ما يتأثر بسياق التكديس تبعه */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-ink/60 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile drawer — overlay ثابت فوق المحتوى، مش جنبه (ما بيدفعه أبدًا) */}
      <div
        id="admin-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="القائمة"
        className={`fixed inset-y-0 start-0 z-[60] w-[82%] max-w-[300px] flex flex-col bg-red-500 text-white/85 shadow-lg transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center font-bold text-sm shrink-0">%</span>
            <span className="font-display font-bold text-white truncate">كوبون نور</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 shrink-0"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <AdminSidebarNav items={navItems} collapsed={false} onNavigate={() => setMobileOpen(false)} />

        <div className="p-3 border-t border-white/10 shrink-0">
          <Link
            href="/"
            target="_blank"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-sm hover:bg-white/10"
          >
            <ExternalLink className="h-4 w-4" /> عرض الموقع
          </Link>
          <div className="flex items-center justify-between px-3.5 py-2.5 gap-2">
            <span className="text-xs text-white/60 truncate min-w-0">{userEmail}</span>
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Desktop sidebar — ثابت بالتخطيط دائمًا (مش overlay)، قابل للطي */}
      <aside
        className={`hidden md:flex shrink-0 bg-red-500 text-white/85 flex-col transition-[width] duration-300 ease-in-out overflow-hidden ${
          desktopCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className={`h-14 flex items-center border-b border-white/10 shrink-0 ${desktopCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {!desktopCollapsed && (
            <Link href="/admin" className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center font-bold text-sm shrink-0">%</span>
              <span className="font-display font-bold text-white truncate">كوبون نور</span>
            </Link>
          )}
          <button
            onClick={() => setDesktopCollapsed((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 shrink-0"
            aria-label={desktopCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            aria-expanded={!desktopCollapsed}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <AdminSidebarNav items={navItems} collapsed={desktopCollapsed} />

        <div className="p-3 border-t border-white/10 shrink-0 flex flex-col gap-1">
          <Link
            href="/"
            target="_blank"
            title={desktopCollapsed ? "عرض الموقع" : undefined}
            className={`flex items-center rounded-md text-sm hover:bg-white/10 ${
              desktopCollapsed ? "h-10 w-10 mx-auto justify-center" : "gap-2.5 px-3.5 py-2.5"
            }`}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {!desktopCollapsed && "عرض الموقع"}
          </Link>
          <div className={desktopCollapsed ? "flex justify-center py-1.5" : "flex items-center justify-between gap-2 px-3.5 py-2.5"}>
            {!desktopCollapsed && <span className="text-xs text-white/60 truncate min-w-0">{userEmail}</span>}
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-bg min-h-screen p-4 sm:p-5 md:p-7 overflow-x-hidden">{children}</main>
    </div>
  );
}
