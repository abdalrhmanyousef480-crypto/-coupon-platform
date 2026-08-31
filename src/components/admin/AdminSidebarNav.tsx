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

export function AdminSidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3">
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive ? "bg-white/15 text-white" : "hover:bg-white/10 hover:text-white"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
