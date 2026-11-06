"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { storeSchema, type StoreInput } from "@/lib/validations";
import { createStore, updateStore, deleteStore } from "@/lib/actions-store";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/utils";
import { Field, Input, Textarea, CheckboxField, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { couponImageSrc } from "@/lib/coupon-image";
import { uploadStoreCardImage } from "@/lib/actions-upload";
import { archiveOneStoreImage } from "@/lib/actions-archive-image";
import type { Store } from "@prisma/client";

interface StoreFormProps {
  categories: { id: string; nameAr: string }[];
  // موجود = تعديل، غير موجود = إضافة جديدة. categories = التصنيفات المسندة حاليًا للمتجر.
  store?: Store & { categories: { categoryId: string }[] };
  /** Published coupons of the store (edit only), for the unified page choices. */
  hubCoupons?: { slug: string; titleAr: string; code: string | null; cardImageUrl: string | null; autoImageUrl: string | null; autoImageCode: string | null }[];
  /** The store has hand-written tips (src/lib/store-tips.ts) shown after «عن المتجر». */
  hasTips?: boolean;
}

export function StoreForm({ categories, store, hubCoupons = [], hasTips = false }: StoreFormProps) {
  const [slugTouched, setSlugTouched] = useState(!!store);
  const [archivingLegacy, setArchivingLegacy] = useState(false);
  const [archivedLegacy, setArchivedLegacy] = useState(Boolean(store?.legacyImageSnapshotUrl));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const router = useRouter();
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: store ? {
      name: store.name, slug: store.slug, logoUrl: store.logoUrl, cardImageUrl: store.cardImageUrl || "", website: store.website,
      description: store.description, descriptionAr: store.descriptionAr,
      categoryIds: store.categories.map((c) => c.categoryId),
      isPublished: store.isPublished, isFeatured: store.isFeatured,
      ogImage: store.ogImage || "", canonicalUrl: store.canonicalUrl || "",
      seoTitle: store.seoTitle || "", seoDescription: store.seoDescription || "",
      seoTitleAr: store.seoTitleAr || "", seoDescriptionAr: store.seoDescriptionAr || "",
      noindex: store.noindex,
      hubCouponSlug: store.hubCouponSlug || "", hubImageSource: store.hubImageSource || "",
    } : { categoryIds: [], isPublished: true, isFeatured: false, noindex: false },
  });

  const nameValue = watch("name");
  const logoUrlValue = watch("logoUrl");
  const cardImageValue = watch("cardImageUrl");
  const categoryIdsValue = watch("categoryIds") ?? [];
  const hubImageValue = watch("hubImageSource") ?? "";
  const imageChoices = store ? [
    { value: "", label: "تلقائي", url: null as string | null },
    { value: "store", label: "صورة المتجر", url: store.cardImageUrl || `/store/${store.slug}/card-image?v=2` },
    ...hubCoupons.map((c) => ({
      value: `coupon:${c.slug}`,
      label: c.code ? `صورة كوبون ${c.code}` : c.titleAr,
      url: couponImageSrc(store.slug, c, { version: 3 }),
    })),
  ] : [];

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
    const result = store ? await updateStore(store.id, data, { stay: true }) : await createStore(data);
    // redirect() بترمي استثناء خاص لو نجحت — فهذا الكود ما يوصله إلا لو فشلت العملية
    if (result && !result.success) toast.error(result.error);
  }

  async function handleDeleteStore() {
    if (!store) return;
    setDeleting(true);
    const result = await deleteStore(store.id, deleteName);
    setDeleting(false);
    if (result.success) { toast.success("تم حذف المتجر"); router.replace("/admin/stores"); }
    else { toast.error(result.error); setConfirmDelete(false); }
  }

  async function handleArchiveLegacy() {
    if (!store || archivingLegacy || archivedLegacy) return;
    setArchivingLegacy(true);
    try {
      const result = await archiveOneStoreImage(store.id);
      if (result.success) {
        setArchivedLegacy(true);
        toast.success("تم تثبيت نسخة مطابقة من الصورة القديمة مع الاحتفاظ برابطها");
      } else toast.error(result.error);
    } catch { toast.error("تعذر تثبيت الصورة"); }
    finally { setArchivingLegacy(false); }
  }

  // ── Edit mode: the side column of the store workspace (/admin/stores/[id]).
  // Store basics first; everything that affects Google ranking lives in a
  // folded "إعدادات متقدمة" section so it is not changed by accident.
  if (store) {
    return (
      <form id="store-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <section className="card p-5 flex flex-col gap-1">
          <h2 className="text-lg font-extrabold text-ink mb-2">بيانات المتجر</h2>
          <Field label="اسم المتجر" required error={errors.name?.message}>
            <Input {...register("name")} onChange={handleNameChange} value={nameValue} />
          </Field>
          <Field label="شعار المتجر" required error={errors.logoUrl?.message}>
            <ImageUploadField
              value={logoUrlValue || ""}
              directKind="store-logo"
              onChange={(url) => setValue("logoUrl", url, { shouldValidate: true, shouldDirty: true })}
            />
            <input type="hidden" {...register("logoUrl")} />
          </Field>
          <Field label="موقع المتجر" required error={errors.website?.message}>
            <Input {...register("website")} dir="ltr" placeholder="https://www.store.com" />
          </Field>
          <Field label="التصنيفات" required error={errors.categoryIds?.message ?? errors.categoryIds?.root?.message}>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = categoryIdsValue.includes(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => toggleCategory(c.id)} disabled={isSubmitting}
                    className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${on ? "bg-primary text-white" : "border border-border-strong text-ink-muted hover:border-primary hover:text-primary"}`}>
                    {c.nameAr}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="عن المتجر" required error={errors.descriptionAr?.message}
            hint={`يظهر في قسم «عن المتجر» أسفل الصفحة${hasTips ? "، وبعده النصائح المكتوبة لهذا المتجر" : ""}. أما الوصف أعلى الصفحة فهو وصف الكود الرئيسي ويُعدَّل من الكود.`}>
            <Textarea {...register("descriptionAr")} rows={4} />
          </Field>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <CheckboxField label="منشور على الموقع" {...register("isPublished")} />
            <CheckboxField label="مميز بالرئيسية" {...register("isFeatured")} />
          </div>
        </section>

        <details className="card group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-extrabold text-ink">
            إعدادات متقدمة
            <span className="text-sm font-bold text-ink-muted group-open:hidden">رابط الصفحة · الصورة · SEO</span>
          </summary>
          <div className="mt-4 flex flex-col gap-1">
            <p className="mb-3 rounded-md bg-warning-soft px-3 py-2.5 text-sm leading-7 text-ink">هذه الإعدادات تؤثر على ترتيب جوجل. غيّرها فقط عند الضرورة.</p>
            <Field label="رابط صفحة المتجر" hint="كل تغيير ينقل قوة الصفحة في جوجل لرابط آخر ويحتاج أسابيع ليستقر.">
              <Select {...register("hubCouponSlug")} dir="ltr">
                <option value="">/store/{store.slug}</option>
                {hubCoupons.map((c) => (
                  <option key={c.slug} value={c.slug}>/store/{store.slug}/coupon/{c.slug}</option>
                ))}
              </Select>
            </Field>
            <Field label="الصورة الظاهرة" hint="صورة واحدة فقط في الصفحة وفي خريطة الموقع. «تلقائي» = صورة الكود الرئيسي أو رابط الصفحة.">
              <input type="hidden" {...register("hubImageSource")} />
              <div className="grid grid-cols-3 gap-2">
                {imageChoices.map((choice) => {
                  const selected = hubImageValue === choice.value;
                  return (
                    <button key={choice.value || "auto"} type="button"
                      onClick={() => setValue("hubImageSource", choice.value, { shouldDirty: true })}
                      aria-pressed={selected}
                      className={`rounded-md border-2 p-1.5 text-center text-[11px] font-bold transition-colors ${selected ? "border-primary text-primary" : "border-border text-ink-muted hover:border-border-strong"}`}>
                      {choice.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={choice.url} alt="" className="mb-1.5 aspect-square w-full rounded-sm object-cover" loading="lazy" />
                      ) : (
                        <span className="mb-1.5 flex aspect-square w-full items-center justify-center rounded-sm bg-surface-alt text-ink-faint">{choice.value ? "قيد التوليد" : "تلقائي"}</span>
                      )}
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="صورة المتجر (اختياري — رفع يدوي)" hint="تظهر فقط إذا اخترت «صورة المتجر» كصورة ظاهرة." error={errors.cardImageUrl?.message}>
              <ImageUploadField value={cardImageValue || ""} directKind="store-card" uploadAction={uploadStoreCardImage}
                onChange={(url) => setValue("cardImageUrl", url, { shouldValidate: true, shouldDirty: true })}
                replaceHint="اضغط لرفع صورة بديلة للمتجر"
                successMessage="تم حفظ صورة المتجر في التخزين الثابت" />
              <input type="hidden" {...register("cardImageUrl")} />
              {cardImageValue && <button type="button" className="mt-2 text-sm text-ink-muted underline" onClick={() => setValue("cardImageUrl", "", { shouldDirty: true })}>إزالة الصورة</button>}
            </Field>
            <Field label="الرابط (Slug)" required error={errors.slug?.message} hint="لا تغيّره لمتجر منشور — يغيّر كل روابط المتجر.">
              <Input {...register("slug")} dir="ltr" onChange={(e) => { setSlugTouched(true); register("slug").onChange(e); }} />
            </Field>
            <Field label="عنوان SEO" hint="70 حرف كحد أقصى — اتركه فارغًا للتوليد التلقائي">
              <Input {...register("seoTitleAr")} maxLength={70} />
            </Field>
            <Field label="وصف SEO" hint="160 حرف كحد أقصى">
              <Textarea {...register("seoDescriptionAr")} maxLength={160} rows={3} />
            </Field>
            <Field label="الوصف بالإنجليزي (اختياري)">
              <Textarea {...register("description")} rows={2} dir="ltr" />
            </Field>
            <Field label="SEO Title / Description (English)">
              <Input {...register("seoTitle")} maxLength={70} dir="ltr" />
              <Textarea {...register("seoDescription")} maxLength={160} rows={2} dir="ltr" className="mt-2" />
            </Field>
            <Field label="صورة Open Graph (اختياري)" hint="لو فاضي، يُستخدم الشعار">
              <Input {...register("ogImage")} dir="ltr" placeholder="https://..." />
            </Field>
            <Field label="Canonical URL (اختياري)" hint="اتركه فاضيًا في الغالب">
              <Input {...register("canonicalUrl")} dir="ltr" placeholder="https://..." />
            </Field>
            <CheckboxField label="إخفاء الصفحة عن محركات البحث (noindex)" {...register("noindex")} />
            {!store.cardImageUrl && store.isPublished && (
              <Button type="button" variant="outline" className="mt-3" disabled={archivedLegacy || archivingLegacy}
                loading={archivingLegacy} onClick={handleArchiveLegacy}>
                {archivedLegacy ? "الصورة القديمة محفوظة وثابتة" : "تثبيت الصورة القديمة برابطها"}
              </Button>
            )}
            <div className="mt-4 border-t border-border pt-4">
              {confirmDelete ? (
                <div className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm">
                  <p className="font-bold text-ink">سيُحذف المتجر وكل أكواده نهائيًا.</p>
                  <p className="leading-7 text-ink-muted">روابطه في جوجل تتحوّل تلقائيًا لصفحة تصنيفه (أو صفحة المتاجر) حتى لا تضيع. للتأكيد اكتب اسم المتجر: <span className="font-bold text-ink">{store?.name}</span></p>
                  <Input value={deleteName} onChange={(e) => setDeleteName(e.target.value)} placeholder={store?.name} />
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="danger" size="sm" loading={deleting}
                      disabled={deleteName.trim() !== (store?.name ?? "").trim()} onClick={handleDeleteStore}>حذف المتجر وأكواده</Button>
                    <button type="button" className="text-ink-muted" onClick={() => { setConfirmDelete(false); setDeleteName(""); }}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-bold text-danger hover:underline">حذف المتجر</button>
              )}
              <p className="mt-1 text-xs text-ink-muted">للإخفاء المؤقت ألغِ «منشور على الموقع» بدل الحذف.</p>
            </div>
          </div>
        </details>

        <Button type="submit" loading={isSubmitting} className="w-full">حفظ بيانات المتجر</Button>
      </form>
    );
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
            directKind="store-logo"
            onChange={(url) => setValue("logoUrl", url, { shouldValidate: true, shouldDirty: true })}
          />
          <div className="mt-2.5">
            <Input {...register("logoUrl")} placeholder="أو الصق رابطًا مباشرة: https://logo.clearbit.com/iherb.com" />
          </div>
        </Field>
        <Field label="صورة المتجر في الصفحة وجوجل (اختياري — رفع يدوي)" hint="المتاجر الجديدة بدون صورة تعرض صورة الكوبون المولّدة تلقائيًا. لو رفعت صورة هنا تظهر كاملة بدون قص." error={errors.cardImageUrl?.message}>
          <ImageUploadField value={cardImageValue || ""} directKind="store-card" uploadAction={uploadStoreCardImage}
            onChange={(url) => setValue("cardImageUrl", url, { shouldValidate: true, shouldDirty: true })}
            replaceHint="اضغط لرفع صورة بديلة للمتجر"
            successMessage="تم حفظ صورة المتجر في التخزين الثابت" />
          <input type="hidden" {...register("cardImageUrl")} />
          {cardImageValue && <button type="button" className="mt-2 text-sm text-ink-muted underline" onClick={() => setValue("cardImageUrl", "", { shouldDirty: true })}>إزالة صورة البطاقة</button>}
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
        <Button type="submit" loading={isSubmitting}>إضافة المتجر</Button>
      </div>
    </form>
  );
}
