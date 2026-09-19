"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { storeSchema, type StoreInput } from "@/lib/validations";
import { createStore, updateStore } from "@/lib/actions-store";
import { toSlug } from "@/lib/utils";
import { Field, Input, Textarea, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { Store } from "@prisma/client";

interface StoreFormProps {
  categories: { id: string; nameAr: string }[];
  // موجود = تعديل، غير موجود = إضافة جديدة. categories = التصنيفات المسندة حاليًا للمتجر.
  store?: Store & { categories: { categoryId: string }[] };
}

export function StoreForm({ categories, store }: StoreFormProps) {
  const [slugTouched, setSlugTouched] = useState(!!store);
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: store ? {
      name: store.name, slug: store.slug, logoUrl: store.logoUrl, website: store.website,
      description: store.description, descriptionAr: store.descriptionAr,
      categoryIds: store.categories.map((c) => c.categoryId),
      isPublished: store.isPublished, isFeatured: store.isFeatured,
      ogImage: store.ogImage || "", canonicalUrl: store.canonicalUrl || "",
      seoTitle: store.seoTitle || "", seoDescription: store.seoDescription || "",
      seoTitleAr: store.seoTitleAr || "", seoDescriptionAr: store.seoDescriptionAr || "",
      noindex: store.noindex,
    } : { categoryIds: [], isPublished: true, isFeatured: false, noindex: false },
  });

  const nameValue = watch("name");
  const logoUrlValue = watch("logoUrl");
  const categoryIdsValue = watch("categoryIds") ?? [];

  // Set-based toggle: نفس التصنيف ما ينضاف مرتين، وإلغاء التحديد بيشيله
  function toggleCategory(id: string) {
    const next = new Set(categoryIdsValue);
    if (!next.delete(id)) next.add(id);
    setValue("categoryIds", Array.from(next), { shouldValidate: true, shouldDirty: true });
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    register("name").onChange(e);
    if (!slugTouched) setValue("slug", toSlug(e.target.value));
  }

  async function onSubmit(data: StoreInput) {
    const result = store ? await updateStore(store.id, data) : await createStore(data);
    // redirect() بترمي استثناء خاص لو نجحت — فهذا الكود ما يوصله إلا لو فشلت العملية
    if (result && !result.success) toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
      <div className="card p-4 sm:p-6 mb-5">
        <h2 className="font-bold text-primary mb-4">المعلومات الأساسية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم المتجر" required error={errors.name?.message}>
            <Input {...register("name")} onChange={handleNameChange} value={nameValue} placeholder="مثال: iHerb" />
          </Field>
          <Field label="الرابط (Slug)" required error={errors.slug?.message} hint="يظهر بالرابط: /store/your-slug">
            <Input {...register("slug")} onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} placeholder="iherb" />
          </Field>
        </div>
        <Field label="شعار المتجر" required error={errors.logoUrl?.message}>
          <ImageUploadField
            value={logoUrlValue || ""}
            onChange={(url) => setValue("logoUrl", url, { shouldValidate: true, shouldDirty: true })}
          />
          <div className="mt-2.5">
            <Input {...register("logoUrl")} placeholder="أو الصق رابطًا مباشرة: https://logo.clearbit.com/iherb.com" />
          </div>
        </Field>
        <Field label="رابط الموقع" required error={errors.website?.message}>
          <Input {...register("website")} placeholder="https://www.store.com" />
        </Field>
        <Field
          label="التصنيفات"
          required
          error={errors.categoryIds?.message ?? errors.categoryIds?.root?.message}
          hint={`اختر تصنيفًا واحدًا أو أكثر — المحدد: ${categoryIdsValue.length}. المتجر يظهر بكل تصنيف تختاره.`}
        >
          {categories.length === 0 ? (
            <p className="text-sm text-ink-muted">لا توجد تصنيفات بعد. أضف تصنيفًا أولًا.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 rounded-lg border border-border bg-surface-alt/60 px-3.5 py-2">
              {categories.map((c) => (
                <CheckboxField
                  key={c.id}
                  label={c.nameAr}
                  checked={categoryIdsValue.includes(c.id)}
                  onChange={() => toggleCategory(c.id)}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          )}
        </Field>
        <Field label="الوصف بالعربي" required error={errors.descriptionAr?.message}>
          <Textarea {...register("descriptionAr")} placeholder="وصف مختصر عن المتجر..." />
        </Field>
        <Field label="الوصف بالإنجليزي" error={errors.description?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
          <Textarea {...register("description")} placeholder="Brief store description..." />
        </Field>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <CheckboxField label="منشور (يظهر على الموقع)" {...register("isPublished")} />
          <CheckboxField label="مميز (يظهر بالرئيسية)" {...register("isFeatured")} />
        </div>
      </div>

      <div className="card p-4 sm:p-6 mb-5">
        <h2 className="font-bold text-primary mb-1">إعدادات SEO</h2>
        <p className="text-xs text-ink-faint mb-4">اتركها فارغة ليتم توليدها تلقائيًا بصيغة احترافية.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="عنوان SEO (عربي)" hint="70 حرف كحد أقصى">
            <Input {...register("seoTitleAr")} maxLength={70} />
          </Field>
          <Field label="SEO Title (English)" hint="Max 70 characters">
            <Input {...register("seoTitle")} maxLength={70} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="وصف SEO (عربي)" hint="160 حرف كحد أقصى">
            <Textarea {...register("seoDescriptionAr")} maxLength={160} />
          </Field>
          <Field label="SEO Description (English)" hint="Max 160 characters">
            <Textarea {...register("seoDescription")} maxLength={160} />
          </Field>
        </div>
        <Field label="صورة Open Graph (اختياري)" hint="لو فاضي، يُستخدم الشعار">
          <Input {...register("ogImage")} placeholder="https://..." />
        </Field>
        <Field label="Canonical URL (اختياري)" hint="اتركه فاضيًا في الغالب">
          <Input {...register("canonicalUrl")} placeholder="https://..." />
        </Field>
        <CheckboxField label="Noindex — إخفاء هذه الصفحة عن محركات البحث" {...register("noindex")} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting}>{store ? "حفظ التعديلات" : "إضافة المتجر"}</Button>
      </div>
    </form>
  );
}
