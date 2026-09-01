"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, ExternalLink } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import { SignOutButton } from "@/components/admin/SignOutButton";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const DESKTOP_QUERY = "(min-width: 768px)";

/** غلاف اللوحة بالكامل: Sidebar قابل للطي (collapse) بنفس الآلية على كل
 *  المقاسات — مو نمط مختلف بالموبايل عن الديسكتوب. بحالة الطي: شريط
 *  أيقونات ضيّق (64px) ثابت بالتخطيط (مو overlay)، فمحتوى الصفحة يتوسّع
 *  تلقائيًا حواليه بدون أي تراكب. بحالة التوسيع: Sidebar كامل بعرض 256px
 *  مع أسماء الأقسام. الافتراضي: مطوي بالموبايل (يحافظ على مساحة كافية
 *  للمحتوى)، وموسّع بالديسكتوب — يتحدد فعليًا وقت التحميل عبر matchMedia. */
export function AdminShell({
  navItems, userEmail, children,
}: { navItems: NavItem[]; userEmail?: string | null; children: React.ReactNode }) {
  // نبدأ بالحالة الآمنة (مطوي) لأن السيرفر ما بيعرف عرض شاشة المستخدم —
  // فيوصل التحميل الأول بأصغر عرض ممكن دائمًا (بدون أي فرق بين SSR
  // والـ hydration الأول)، وبعدها useEffect تحت يصحّح الحالة فورًا حسب
  // عرض الشاشة الفعلي.
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    setCollapsed(!mq.matches);

    // لو المستخدم صغّر نافذة المتصفح (أو دار الجهاز) ونزل تحت md وهو
    // بحالة موسّعة، نطويها تلقائيًا — نفس مبدأ "بدون تراكب بأي حالة".
    // بالاتجاه المعاكس (رجوع لعرض أكبر) ما نفرض التوسيع، عشان نحترم
    // اختيار المستخدم اليدوي لو كان طوى القائمة بنفسه على الديسكتوب.
    function handleChange(e: MediaQueryListEvent) {
      if (!e.matches) setCollapsed(true);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // بعد اختيار رابط من القائمة على الموبايل، القائمة الموسّعة كانت
  // مؤقتة أصلًا (المستخدم فتحها بس عشان يختار وجهة) — نطويها فورًا
  // فيرجع المحتوى ياخذ العرض الكامل.
  function handleNavigate() {
    if (typeof window !== "undefined" && !window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed(true);
    }
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <aside
        className={`shrink-0 bg-primary text-white/85 flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className={`h-14 flex items-center border-b border-white/10 shrink-0 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {!collapsed && (
            <Link href="/admin" onClick={handleNavigate} className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center font-bold text-sm shrink-0">%</span>
              <span className="font-display font-bold text-white truncate">كوبون نور</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 shrink-0"
            aria-label={collapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            aria-expanded={!collapsed}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <AdminSidebarNav items={navItems} collapsed={collapsed} onNavigate={handleNavigate} />

        <div className="p-3 border-t border-white/10 shrink-0 flex flex-col gap-1">
          <Link
            href="/"
            target="_blank"
            title={collapsed ? "عرض الموقع" : undefined}
            className={`flex items-center rounded-md text-sm hover:bg-white/10 ${
              collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-2.5 px-3.5 py-2.5"
            }`}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {!collapsed && "عرض الموقع"}
          </Link>
          <div className={collapsed ? "flex justify-center py-1.5" : "flex items-center justify-between gap-2 px-3.5 py-2.5"}>
            {!collapsed && <span className="text-xs text-white/60 truncate min-w-0">{userEmail}</span>}
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-bg min-h-screen p-4 sm:p-5 md:p-7 overflow-x-hidden">{children}</main>
    </div>
  );
}
