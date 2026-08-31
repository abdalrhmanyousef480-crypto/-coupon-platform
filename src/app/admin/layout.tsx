import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LayoutDashboard, Store, Tag, FolderTree, FileText, ExternalLink, Settings } from "lucide-react";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";

// هذا الـ layout يغلّف كل صفحات /admin ما عدا /admin/login (لها layout مستقل أبسط)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // الأيقونات تُرسم هون (JSX جاهز) وليس كـ component reference خام، لأن
  // Next.js ما بيسمح بتمرير component functions من Server Component
  // (هاد الـ layout) لـ Client Component (AdminSidebarNav) — بس عناصر
  // React الجاهزة قابلة للتسلسل وتمر بدون مشاكل.
  const iconClass = "h-4 w-4";
  const navItems = [
    { href: "/admin", label: "لوحة التحكم", icon: <LayoutDashboard className={iconClass} />, exact: true },
    { href: "/admin/stores", label: "المتاجر", icon: <Store className={iconClass} /> },
    { href: "/admin/coupons", label: "الكوبونات", icon: <Tag className={iconClass} /> },
    { href: "/admin/categories", label: "التصنيفات", icon: <FolderTree className={iconClass} /> },
    { href: "/admin/articles", label: "المقالات", icon: <FileText className={iconClass} /> },
    { href: "/admin/settings", label: "الإعدادات", icon: <Settings className={iconClass} /> },
  ];

  return (
    <div className="min-h-screen flex" dir="rtl">
      <aside className="w-64 bg-primary text-white/85 flex flex-col shrink-0">
        <Link href="/admin" className="p-5 flex items-center gap-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center font-bold text-sm">%</span>
          <span className="font-display font-bold text-white">كوبون نور</span>
        </Link>
        <AdminSidebarNav items={navItems} />
        <div className="p-3 border-t border-white/10">
          <Link href="/" target="_blank" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-sm hover:bg-white/10">
            <ExternalLink className="h-4 w-4" /> عرض الموقع
          </Link>
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-xs text-white/60 truncate">{session?.user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="flex-1 bg-bg min-h-screen p-7 overflow-x-auto">{children}</main>
    </div>
  );
}
