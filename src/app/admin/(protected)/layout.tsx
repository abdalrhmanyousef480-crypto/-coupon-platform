import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LayoutDashboard, Store, Tag, FolderTree, FileText, Settings } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

// هذا الـ layout جوّا route group باسم (protected) — يغلّف كل صفحات
// /admin المحمية فقط. /admin/login خارج هالمجموعة عمدًا (بمجلد شقيق
// src/app/admin/login/) عشان ما يرث AdminShell (Sidebar/Header) —
// لو كانت login جوّا نفس شجرة /admin مباشرة كانت هترث هذا الـ layout
// تلقائيًا زي أي صفحة تانية تحت /admin، وهيك تظهر صفحة الدخول
// بالـ Sidebar وبار الموبايل حواليها (bug حقيقي انصلح بنقلها لـ route
// group منفصل — راجع أسماء المجلدات لفهم الـ URL: (protected) ما
// بيظهر بالرابط، فـ /admin و/admin/stores...إلخ ما تغيّرت).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // الأيقونات تُرسم هون (JSX جاهز) وليس كـ component reference خام، لأن
  // Next.js ما بيسمح بتمرير component functions من Server Component
  // (هاد الـ layout) لـ Client Component (AdminShell) — بس عناصر
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
    <AdminShell navItems={navItems} userEmail={session?.user?.email}>
      {children}
    </AdminShell>
  );
}
