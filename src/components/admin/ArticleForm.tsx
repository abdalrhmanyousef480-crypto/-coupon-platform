"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { articleSchema, type ArticleInput } from "@/lib/validations";
import { createArticle, updateArticle } from "@/lib/actions-article";
import { toSlug } from "@/lib/utils";
import { Field, Input, Textarea, Select, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { Category, Article } from "@prisma/client";

export function ArticleForm({ categories, article }: { categories: Category[]; article?: Article }) {
  const [slugTouched, setSlugTouched] = useState(!!article);
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<ArticleInput>({
    resolver: zodResolver(articleSchema),
    defaultValues: article ? {
      title: article.title, titleAr: article.titleAr, slug: article.slug,
      excerpt: article.excerpt, excerptAr: article.excerptAr,
      content: article.content, contentAr: article.contentAr,
      featuredImage: article.featuredImage, categoryId: article.categoryId || "",
      status: article.status, canonicalUrl: article.canonicalUrl || "",
      seoTitle: article.seoTitle || "", seoDescription: article.seoDescription || "",
      seoTitleAr: article.seoTitleAr || "", seoDescriptionAr: article.seoDescriptionAr || "",
      noindex: article.noindex,
    } : { status: "DRAFT", noindex: false },
  });

  const titleArValue = watch("titleAr");
  const titleValue = watch("title");

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    register("title").onChange(e);
    // نفس المبدأ: السلج يُشتق من العنوان الإنجليزي فقط، لأن أدوات
    // توليد السلاجات تحذف الأحرف العربية بدل تحويلها لروابط مقروءة.
    if (!slugTouched) setValue("slug", toSlug(e.target.value));
  }

  async function onSubmit(data: ArticleInput) {
    const result = article ? await updateArticle(article.id, data) : await createArticle(data);
    if (result && !result.success) toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
      <div className="card p-6 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="العنوان بالعربي" required error={errors.titleAr?.message}>
            <Input {...register("titleAr")} value={titleArValue} />
          </Field>
          <Field label="Title (English)" error={errors.title?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
            <Input {...register("title")} onChange={handleTitleChange} value={titleValue} />
          </Field>
        </div>
        <Field label="الرابط (Slug)" required error={errors.slug?.message}>
          <Input {...register("slug")} onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="التصنيف (اختياري)">
            <Select {...register("categoryId")}>
              <option value="">بدون تصنيف</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select {...register("status")}>
              <option value="DRAFT">مسودة</option>
              <option value="PUBLISHED">منشور</option>
            </Select>
          </Field>
        </div>
        <Field label="رابط الصورة الرئيسية" required error={errors.featuredImage?.message}>
          <Input {...register("featuredImage")} placeholder="https://..." />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مقتطف بالعربي" required error={errors.excerptAr?.message}>
            <Textarea {...register("excerptAr")} />
          </Field>
          <Field label="Excerpt (English)" error={errors.excerpt?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
            <Textarea {...register("excerpt")} />
          </Field>
        </div>
        <Field label="محتوى المقال بالعربي" required error={errors.contentAr?.message} hint="افصل الفقرات بسطر فاضي. استخدم ## قبل أي عنوان فرعي.">
          <Textarea {...register("contentAr")} rows={12} />
        </Field>
        <Field label="Article Content (English)" error={errors.content?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية. Separate paragraphs with a blank line. Use ## before subheadings.">
          <Textarea {...register("content")} rows={12} />
        </Field>
      </div>

      <div className="card p-6 mb-5">
        <h2 className="font-bold text-primary mb-1">إعدادات SEO</h2>
        <p className="text-xs text-ink-faint mb-4">اتركها فارغة ليتم توليدها تلقائيًا بصيغة احترافية.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عنوان SEO (عربي)"><Input {...register("seoTitleAr")} maxLength={70} /></Field>
          <Field label="SEO Title (English)"><Input {...register("seoTitle")} maxLength={70} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="وصف SEO (عربي)"><Textarea {...register("seoDescriptionAr")} maxLength={160} /></Field>
          <Field label="SEO Description (English)"><Textarea {...register("seoDescription")} maxLength={160} /></Field>
        </div>
        <Field label="Canonical URL (اختياري)" hint="استخدمه فقط لو نفس محتوى هذا المقال منشور أيضًا على رابط آخر، لإخبار جوجل أي رابط هو الأساسي. اتركه فاضيًا في الغالب.">
          <Input {...register("canonicalUrl")} placeholder="https://..." />
        </Field>
        <CheckboxField label="Noindex — إخفاء هذه الصفحة عن محركات البحث" {...register("noindex")} />
      </div>

      <Button type="submit" loading={isSubmitting}>{article ? "حفظ التعديلات" : "إضافة المقال"}</Button>
    </form>
  );
}
