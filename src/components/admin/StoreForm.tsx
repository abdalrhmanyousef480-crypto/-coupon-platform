"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { storeSchema, type StoreInput } from "@/lib/validations";
import { createStore, updateStore } from "@/lib/actions-store";
import { toSlug } from "@/lib/utils";
import { Field, Input, Textarea, Select, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { Category, Store } from "@prisma/client";

interface StoreFormProps {
  categories: Category[];
  store?: Store; // موجود = تعديل، غير موجود = إضافة جديدة
}

export function StoreForm({ categories, store }: StoreFormProps) {
  const [slugTouched, setSlugTouched] = useState(!!store);
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: store ? {
      name: store.name, slug: store.slug, logoUrl: store.logoUrl, website: store.website,
      description: store.description, descriptionAr: store.descriptionAr, categoryId: store.categoryId,
      isPublished: store.isPublished, isFeatured: store.isFeatured,
      ogImage: store.ogImage || "", canonicalUrl: store.canonicalUrl || "",
      seoTitle: store.seoTitle || "", seoDescription: store.seoDescription || "",
      seoTitleAr: store.seoTitleAr || "", seoDescriptionAr: store.seoDescriptionAr || "",
      noindex: store.noindex,
    } : { isPublished: true, isFeatured: false, noindex: false },
  });

  const nameValue = watch("name");
  const logoUrlValue = watch("logoUrl");

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
      <div className="card p-6 mb-5">
        <h2 className="font-bold text-primary mb-4">المعلومات الأساسية</h2>
        <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="رابط الموقع" required error={errors.website?.message}>
            <Input {...register("website")} placeholder="https://www.store.com" />
          </Field>
          <Field label="التصنيف" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")}>
              <option value="">اختر تصنيفًا</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الوصف بالعربي" required error={errors.descriptionAr?.message}>
          <Textarea {...register("descriptionAr")} placeholder="وصف مختصر عن المتجر..." />
        </Field>
        <Field label="الوصف بالإنجليزي" error={errors.description?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
          <Textarea {...register("description")} placeholder="Brief store description..." />
        </Field>
        <div className="flex gap-6">
          <CheckboxField label="منشور (يظهر على الموقع)" {...register("isPublished")} />
          <CheckboxField label="مميز (يظهر بالرئيسية)" {...register("isFeatured")} />
        </div>
      </div>

      <div className="card p-6 mb-5">
        <h2 className="font-bold text-primary mb-1">إعدادات SEO</h2>
        <p className="text-xs text-ink-faint mb-4">اتركها فارغة ليتم توليدها تلقائيًا بصيغة احترافية.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عنوان SEO (عربي)" hint="70 حرف كحد أقصى">
            <Input {...register("seoTitleAr")} maxLength={70} />
          </Field>
          <Field label="SEO Title (English)" hint="Max 70 characters">
            <Input {...register("seoTitle")} maxLength={70} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
