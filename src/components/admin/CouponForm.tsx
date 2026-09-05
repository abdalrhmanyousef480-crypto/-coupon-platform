"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { couponSchema, type CouponInput } from "@/lib/validations";
import { createCoupon, updateCoupon } from "@/lib/actions-coupon";
import { toSlug } from "@/lib/utils";
import { couponSeoSuggestions, couponDescriptionSuggestion } from "@/lib/seo";
import { Field, Input, Textarea, Select, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { Coupon } from "@prisma/client";

interface CouponFormProps {
  stores: { id: string; name: string; website: string; categoryId: string; descriptionAr: string }[];
  categories: { id: string; nameAr: string }[];
  coupon?: Coupon;
}

export function CouponForm({ stores, categories, coupon }: CouponFormProps) {
  const [slugTouched, setSlugTouched] = useState(!!coupon);
  const [categoryTouched, setCategoryTouched] = useState(!!coupon);
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
      isTopCoupon: coupon.isTopCoupon, topCouponOrder: coupon.topCouponOrder != null ? String(coupon.topCouponOrder) : "",
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : "",
      canonicalUrl: coupon.canonicalUrl || "",
      seoTitle: coupon.seoTitle || "", seoDescription: coupon.seoDescription || "",
      seoTitleAr: coupon.seoTitleAr || "", seoDescriptionAr: coupon.seoDescriptionAr || "",
      noindex: coupon.noindex,
    } : { type: "CODE", isPublished: true, isVerified: false, isFeatured: false, isTopCoupon: false, noindex: false },
  });

  const storeIdValue = watch("storeId");
  const typeValue = watch("type");
  const isTopCouponValue = watch("isTopCoupon");
  const selectedStore = stores.find((s) => s.id === storeIdValue);

  function handleStoreChange(e: React.ChangeEvent<HTMLSelectElement>) {
    register("storeId").onChange(e);
    const store = stores.find((s) => s.id === e.target.value);
    if (!store) return;
    setValue("storeUrl", store.website, { shouldValidate: true });
    if (!slugTouched) setValue("slug", `${toSlug(store.name)}-discount-code`, { shouldValidate: true });
    if (!categoryTouched) setValue("categoryId", store.categoryId, { shouldValidate: true });
  }

  function handleGenerateDescription() {
    const titleAr = watch("titleAr");
    if (!selectedStore || !titleAr) {
      toast.error("اختر المتجر وأدخل العنوان بالعربي أولًا");
      return;
    }
    const categoryNameAr = categories.find((c) => c.id === (watch("categoryId") || selectedStore.categoryId))?.nameAr;
    const suggestion = couponDescriptionSuggestion({
      titleAr,
      storeName: selectedStore.name,
      categoryNameAr,
      storeDescriptionAr: selectedStore.descriptionAr,
    });
    setValue("descriptionAr", suggestion, { shouldValidate: true });
  }

  function handleGenerateSeo() {
    const suggestions = couponSeoSuggestions({
      titleAr: watch("titleAr") || "",
      descriptionAr: watch("descriptionAr") || "",
      storeName: selectedStore?.name || "",
      title: watch("title"),
      description: watch("description"),
    });
    setValue("seoTitleAr", suggestions.seoTitleAr, { shouldValidate: true });
    setValue("seoDescriptionAr", suggestions.seoDescriptionAr, { shouldValidate: true });
    if (suggestions.seoTitle) setValue("seoTitle", suggestions.seoTitle, { shouldValidate: true });
    if (suggestions.seoDescription) setValue("seoDescription", suggestions.seoDescription, { shouldValidate: true });
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
            <Select {...register("storeId")} onChange={handleStoreChange}>
              <option value="">اختر متجرًا</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="التصنيف (اختياري)" error={errors.categoryId?.message} hint="يُملأ تلقائيًا بتصنيف المتجر المختار، وتقدر تغيّره لهذا الكوبون تحديدًا">
            <Select {...register("categoryId")} onChange={(e) => { setCategoryTouched(true); register("categoryId").onChange(e); }}>
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
            <Input {...register("title")} placeholder="20% off first order" />
          </Field>
        </div>

        <Field label="الرابط (Slug)" required error={errors.slug?.message} hint="يُملأ تلقائيًا من اسم المتجر (مثال: rebune-discount-code)، وتقدر تعدّله يدويًا">
          <Input {...register("slug")} onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} placeholder="store-discount-code" />
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
            <button type="button" onClick={handleGenerateDescription} className="text-xs text-accent hover:underline mt-1">
              توليد تلقائي من بيانات المتجر
            </button>
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

        <input type="hidden" {...register("storeUrl")} />
        {errors.storeUrl?.message && <p className="form-error">{errors.storeUrl.message}</p>}
        <Field label="رابط الأفلييت (اختياري)" hint={`رابط المتجر يُؤخذ تلقائيًا من بيانات المتجر (${selectedStore?.website || "اختر متجرًا أولًا"})، هذا الحقل فقط لو عندك رابط أفلييت مختلف`}>
          <Input {...register("affiliateUrl")} placeholder="https://www.store.com/?ref=..." />
        </Field>

        <Field label="تاريخ الانتهاء (اختياري)" error={errors.expiresAt?.message}>
          <Input type="date" {...register("expiresAt")} />
        </Field>

        <div className="flex gap-6 flex-wrap">
          <CheckboxField label="منشور (يظهر على الموقع)" {...register("isPublished")} />
          <CheckboxField label="موثّق (Verified)" {...register("isVerified")} />
          <CheckboxField label="مميز (يظهر أولًا بصفحة كل الكوبونات وصفحة المتجر)" {...register("isFeatured")} />
        </div>
        <p className="text-xs text-ink-faint mt-2">
          فعّل "موثّق" فقط بعد تجربة الكود بنفسك والتأكد أنه يعمل فعليًا — هذا ما يُظهر شارة "تم التحقق" الخضراء للزوار،
          وهي أساس ثقتهم بالموقع. لا تفعّلها بشكل تلقائي دون تحقق حقيقي.
        </p>

        <div className="mt-4 rounded-md border border-accent/20 bg-accent-soft/30 p-4">
          <CheckboxField label="إضافة إلى «أفضل الكوبونات» بالرئيسية" {...register("isTopCoupon")} />
          <p className="text-xs text-ink-faint mt-1.5 mb-3">
            حقل منفصل تمامًا عن "مميز" أعلاه — هذا هو المتحكم الوحيد بقسم "أفضل الكوبونات" بالصفحة الرئيسية (أول 6 كوبونات فقط تظهر).
          </p>
          {isTopCouponValue && (
            <Field
              label="الترتيب ضمن القسم (اختياري)"
              error={errors.topCouponOrder?.message}
              hint="الرقم الأصغر يظهر أولًا. اتركه فاضيًا ليظهر بعد الكوبونات المرتّبة يدويًا (حسب الأحدث)."
            >
              <Input type="number" {...register("topCouponOrder")} placeholder="مثال: 1" className="max-w-[160px]" />
            </Field>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-6 mb-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-bold text-primary">إعدادات SEO</h2>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerateSeo}>توليد تلقائي</Button>
        </div>
        <p className="text-xs text-ink-faint mb-4">اتركها فارغة ليتم توليدها تلقائيًا، أو اضغط "توليد تلقائي" لمعاينة النص المقترح وتعديله قبل الحفظ.</p>
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
