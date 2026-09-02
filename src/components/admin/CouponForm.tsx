"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { couponSchema, type CouponInput } from "@/lib/validations";
import { createCoupon, updateCoupon } from "@/lib/actions-coupon";
import { toSlug } from "@/lib/utils";
import { Field, Input, Textarea, Select, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { Coupon } from "@prisma/client";

interface CouponFormProps {
  stores: { id: string; name: string }[];
  categories: { id: string; nameAr: string }[];
  coupon?: Coupon;
}

export function CouponForm({ stores, categories, coupon }: CouponFormProps) {
  const [slugTouched, setSlugTouched] = useState(!!coupon);
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon ? {
      storeId: coupon.storeId, categoryId: coupon.categoryId || "", slug: coupon.slug,
      title: coupon.title, titleAr: coupon.titleAr,
      description: coupon.description, descriptionAr: coupon.descriptionAr,
      terms: coupon.terms || "", termsAr: coupon.termsAr || "",
      type: coupon.type, code: coupon.code || "", discountLabel: coupon.discountLabel,
      storeUrl: coupon.storeUrl, affiliateUrl: coupon.affiliateUrl || "",
      isVerified: coupon.isVerified, isPublished: coupon.isPublished, isFeatured: coupon.isFeatured,
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : "",
      canonicalUrl: coupon.canonicalUrl || "",
      seoTitle: coupon.seoTitle || "", seoDescription: coupon.seoDescription || "",
      seoTitleAr: coupon.seoTitleAr || "", seoDescriptionAr: coupon.seoDescriptionAr || "",
      noindex: coupon.noindex,
    } : { type: "CODE", isPublished: true, isVerified: false, isFeatured: false, noindex: false },
  });

  const titleValue = watch("title");
  const typeValue = watch("type");

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    register("title").onChange(e);
    if (!slugTouched) setValue("slug", toSlug(e.target.value));
  }

  async function onSubmit(data: CouponInput) {
    const result = coupon ? await updateCoupon(coupon.id, data) : await createCoupon(data);
    if (result && !result.success) toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
      <div className="card p-4 sm:p-6 mb-5">
        <h2 className="font-bold text-primary mb-4">المعلومات الأساسية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="المتجر" required error={errors.storeId?.message}>
            <Select {...register("storeId")}>
              <option value="">اختر متجرًا</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="التصنيف (اختياري)" error={errors.categoryId?.message} hint="لو تُرك فاضي، يُستخدم تصنيف المتجر تلقائيًا">
            <Select {...register("categoryId")}>
              <option value="">استخدام تصنيف المتجر</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="العنوان بالعربي" required error={errors.titleAr?.message}>
            <Input {...register("titleAr")} placeholder="خصم 20% على أول طلب" />
          </Field>
          <Field label="Title (English)" error={errors.title?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
            <Input {...register("title")} onChange={handleTitleChange} value={titleValue} placeholder="20% off first order" />
          </Field>
        </div>

        <Field label="الرابط (Slug)" required error={errors.slug?.message} hint="فريد ضمن نفس المتجر: /store/[store]/coupon/your-slug">
          <Input {...register("slug")} onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} placeholder="20-off-first-order" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="نوع الكوبون" required>
            <Select {...register("type")}>
              <option value="CODE">كود خصم</option>
              <option value="DEAL">عرض (بدون كود)</option>
              <option value="CASHBACK">كاش باك</option>
            </Select>
          </Field>
          <Field label="نص الخصم" required error={errors.discountLabel?.message} hint="مثال: 20% أو Free Shipping">
            <Input {...register("discountLabel")} placeholder="20%" />
          </Field>
          <Field label="الكود" error={errors.code?.message} hint={typeValue === "CODE" ? "مطلوب لهذا النوع" : "اختياري"}>
            <Input {...register("code")} placeholder="SAVE20" className="font-mono" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الوصف بالعربي" required error={errors.descriptionAr?.message}>
            <Textarea {...register("descriptionAr")} placeholder="وصف مختصر عن العرض..." />
          </Field>
          <Field label="Description (English)" error={errors.description?.message} hint="اختياري - للنسخة الإنجليزية المستقبلية">
            <Textarea {...register("description")} placeholder="Brief offer description..." />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الشروط بالعربي (اختياري)">
            <Textarea {...register("termsAr")} placeholder="شروط الاستخدام..." />
          </Field>
          <Field label="Terms (English, optional)">
            <Textarea {...register("terms")} placeholder="Usage terms..." />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رابط المتجر" required error={errors.storeUrl?.message}>
            <Input {...register("storeUrl")} placeholder="https://www.store.com" />
          </Field>
          <Field label="رابط الأفلييت (اختياري)" hint="لو فاضي، يُستخدم رابط المتجر العادي">
            <Input {...register("affiliateUrl")} placeholder="https://www.store.com/?ref=..." />
          </Field>
        </div>

        <Field label="تاريخ الانتهاء (اختياري)" error={errors.expiresAt?.message}>
          <Input type="date" {...register("expiresAt")} />
        </Field>

        <div className="flex gap-6 flex-wrap">
          <CheckboxField label="منشور (يظهر على الموقع)" {...register("isPublished")} />
          <CheckboxField label="موثّق (Verified)" {...register("isVerified")} />
          <CheckboxField label="مميز (يظهر بالرئيسية)" {...register("isFeatured")} />
        </div>
        <p className="text-xs text-ink-faint mt-2">
          فعّل "موثّق" فقط بعد تجربة الكود بنفسك والتأكد أنه يعمل فعليًا — هذا ما يُظهر شارة "تم التحقق" الخضراء للزوار،
          وهي أساس ثقتهم بالموقع. لا تفعّلها بشكل تلقائي دون تحقق حقيقي.
        </p>
      </div>

      <div className="card p-4 sm:p-6 mb-5">
        <h2 className="font-bold text-primary mb-1">إعدادات SEO</h2>
        <p className="text-xs text-ink-faint mb-4">اتركها فارغة ليتم توليدها تلقائيًا.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="عنوان SEO (عربي)"><Input {...register("seoTitleAr")} maxLength={70} /></Field>
          <Field label="SEO Title (English)"><Input {...register("seoTitle")} maxLength={70} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="وصف SEO (عربي)"><Textarea {...register("seoDescriptionAr")} maxLength={160} /></Field>
          <Field label="SEO Description (English)"><Textarea {...register("seoDescription")} maxLength={160} /></Field>
        </div>
        <Field label="Canonical URL (اختياري)" hint="استخدمه فقط لو نفس محتوى هذا الكوبون منشور أيضًا على رابط آخر، لإخبار جوجل أي رابط هو الأساسي. اتركه فاضيًا في الغالب.">
          <Input {...register("canonicalUrl")} placeholder="https://..." />
        </Field>
        <CheckboxField label="Noindex — إخفاء هذه الصفحة عن محركات البحث" {...register("noindex")} />
      </div>

      <Button type="submit" loading={isSubmitting}>{coupon ? "حفظ التعديلات" : "إضافة الكوبون"}</Button>
    </form>
  );
}
