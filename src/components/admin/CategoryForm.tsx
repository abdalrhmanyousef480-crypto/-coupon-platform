"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { categorySchema, type CategoryInput } from "@/lib/validations";
import { createCategory, updateCategory } from "@/lib/actions-category";
import { toSlug } from "@/lib/utils";
import { Field, Input, Textarea, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { Category } from "@prisma/client";

const AVAILABLE_ICONS = [
  "tag", "shirt", "cpu", "plane", "sparkles", "heart", "home", "utensils", "dumbbell", "baby", "smartphone", "cloud",
  "car", "gamepad-2", "utensils-crossed", "book-open", "sofa", "gift",
];

// نفس منطق تحويل اسم الأيقونة (kebab-case) لاسم export بمكتبة lucide-react
// المُستخدم فعليًا بعرض التصنيف بالموقع العام (راجع ContentCards.tsx)
function toPascalCase(str: string) {
  return str.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

export function CategoryForm({ category }: { category?: Category }) {
  const [slugTouched, setSlugTouched] = useState(!!category);
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? {
      name: category.name, nameAr: category.nameAr, slug: category.slug,
      description: category.description, descriptionAr: category.descriptionAr, icon: category.icon,
      emoji: category.emoji,
      isPublished: category.isPublished,
      seoTitle: category.seoTitle || "", seoDescription: category.seoDescription || "",
      seoTitleAr: category.seoTitleAr || "", seoDescriptionAr: category.seoDescriptionAr || "",
      noindex: category.noindex,
    } : { icon: "tag", emoji: "🏷️", isPublished: true, noindex: false },
  });

  const nameArValue = watch("nameAr");
  const nameValue = watch("name");
  const iconValue = watch("icon");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    register("name").onChange(e);
    // السلج يُشتق دائمًا من الاسم الإنجليزي (نص لاتيني آمن للروابط)،
    // وليس من الاسم العربي — لأن أدوات توليد السلاجات تحذف الأحرف
    // العربية بدل تحويلها، فينتج رابط فاضي أو غير مفهوم.
    if (!slugTouched) setValue("slug", toSlug(e.target.value));
  }

  async function onSubmit(data: CategoryInput) {
    const result = category ? await updateCategory(category.id, data) : await createCategory(data);
    if (result && !result.success) toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      <div className="card p-4 sm:p-6 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الاسم بالعربي" required error={errors.nameAr?.message}>
            <Input {...register("nameAr")} value={nameArValue} placeholder="أزياء" />
          </Field>
          <Field label="Name (English)" error={errors.name?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
            <Input {...register("name")} onChange={handleNameChange} value={nameValue} placeholder="Fashion" />
          </Field>
        </div>
        <Field label="الرابط (Slug)" required error={errors.slug?.message}>
          <Input {...register("slug")} onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} placeholder="fashion" />
        </Field>
        <Field label="الإيموجي" required error={errors.emoji?.message} hint="يظهر هذا الإيموجي بجانب اسم التصنيف بكل صفحات الموقع">
          <Input {...register("emoji")} placeholder="🏷️" className="max-w-[100px] text-xl text-center" />
        </Field>
        <Field label="الأيقونة" hint="تظهر هذه الأيقونة بجانب اسم التصنيف بكل صفحات الموقع">
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {AVAILABLE_ICONS.map((icon) => {
              const IconComp = (Icons[toPascalCase(icon) as keyof typeof Icons] || Icons.Tag) as LucideIcon;
              const selected = iconValue === icon;
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setValue("icon", icon, { shouldValidate: true, shouldDirty: true })}
                  title={icon}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md border transition-colors",
                    selected
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border-strong text-ink-muted hover:border-primary hover:bg-surface-alt"
                  )}
                >
                  <IconComp className="h-[18px] w-[18px]" />
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الوصف بالعربي" required error={errors.descriptionAr?.message}>
            <Textarea {...register("descriptionAr")} />
          </Field>
          <Field label="Description (English)" error={errors.description?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
            <Textarea {...register("description")} />
          </Field>
        </div>
        <CheckboxField label="منشور" {...register("isPublished")} />
      </div>

      <div className="card p-4 sm:p-6 mb-5">
        <h2 className="font-bold text-primary mb-1">إعدادات SEO</h2>
        <p className="text-xs text-ink-faint mb-4">اتركها فارغة ليتم توليدها تلقائيًا بصيغة احترافية.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="عنوان SEO (عربي)"><Input {...register("seoTitleAr")} maxLength={70} /></Field>
          <Field label="SEO Title (English)"><Input {...register("seoTitle")} maxLength={70} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="وصف SEO (عربي)"><Textarea {...register("seoDescriptionAr")} maxLength={160} /></Field>
          <Field label="SEO Description (English)"><Textarea {...register("seoDescription")} maxLength={160} /></Field>
        </div>
        <CheckboxField label="Noindex" {...register("noindex")} />
      </div>

      <Button type="submit" loading={isSubmitting}>{category ? "حفظ التعديلات" : "إضافة التصنيف"}</Button>
    </form>
  );
}
