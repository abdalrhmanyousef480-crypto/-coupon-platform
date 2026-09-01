import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div>
      <AdminPageHeader title="إضافة تصنيف جديد" />
      <CategoryForm />
    </div>
  );
}
