"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  // عنصر JSX جاهز (مرسوم بالفعل بالـ Server Component الأب) وليس component
  // reference خام — لأن Next.js ما بيسمح بتمرير component functions (زي
  // أيقونات lucide-react) كـ props من Server Component لـ Client Component،
  // بس عناصر React الجاهزة (JSX) قابلة للتسلسل وتمر بدون مشاكل.
  icon: React.ReactNode;
  exact?: boolean;
}

interface AdminSidebarNavProps {
  items: NavItem[];
  /** بحالة الطي: أيقونات فقط بدون نص، وسط كل عنصر — بحالة التوسيع: أيقونة + الاسم. */
  collapsed: boolean;
  /** يُستدعى عند الضغط على أي رابط — تُستخدم بـ AdminShell لطي القائمة تلقائيًا
   *  بعد التنقل على الموبايل (القائمة الموسّعة بالموبايل مؤقتة، مو دائمة). */
  onNavigate?: () => void;
}

export function AdminSidebarNav({ items, collapsed, onNavigate }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1">
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-colors shrink-0",
              collapsed ? "h-10 w-10 mx-auto justify-center" : "gap-2.5 px-3.5 py-2.5",
              isActive ? "bg-white/15 text-white" : "hover:bg-white/10 hover:text-white"
            )}
          >
            {item.icon}
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
