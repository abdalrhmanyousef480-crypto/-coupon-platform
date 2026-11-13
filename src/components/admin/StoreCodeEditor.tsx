"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { couponSchema, type CouponInput, HERO_DESCRIPTION_MAX } from "@/lib/validations";
import { createCoupon, updateCoupon } from "@/lib/actions-coupon";
import { Field, Input, Textarea, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { uploadCouponCardImage } from "@/lib/actions-upload";
import type { Coupon } from "@prisma/client";

interface StoreCodeEditorProps {
  store: { id: string; name: string; slug: string; website: string };
  /** Present = edit this code; absent = add a new one. */
  coupon?: Coupon;
  /** Slugs already used by this store's coupons (to pick a free one for new codes). */
  usedSlugs: string[];
  /** The store page's main code: its description is the one shown at the top. */
  isMain: boolean;
  onClose: () => void;
}

/**
 * Add / edit one code inside the store workspace. Same server actions and
 * validation as the full coupon form; store, URL and slug are filled in.
 */
export function StoreCodeEditor({ store, coupon, usedSlugs, isMain, onClose }: StoreCodeEditorProps) {
  const isEdit = Boolean(coupon);
  const brand = store.name.replace(/\s*[|｜]\s*/g, " ").trim();
  const [moreOpen, setMoreOpen] = useState(false);
  const [titleTouched, setTitleTouched] = useState(isEdit);
  const [imageMode, setImageMode] = useState<"auto" | "manual">(coupon?.cardImageUrl ? "manual" : "auto");

  const {
    register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon ? {
      storeId: coupon.storeId, categoryId: coupon.categoryId || "", slug: coupon.slug, cardImageUrl: coupon.cardImageUrl || "",
      proofImageUrl: coupon.proofImageUrl || "",
      proofCheckedAt: coupon.proofCheckedAt ? new Date(coupon.proofCheckedAt).toISOString().slice(0, 10) : "",
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
    } : {
      storeId: store.id, storeUrl: store.website, type: "CODE", slug: "", code: "", discountLabel: "",
      title: "", titleAr: `كود خصم ${brand}`, description: "", descriptionAr: "",
      isPublished: true, isVerified: false, isFeatured: false, isTopCoupon: false, noindex: false,
      cardImageUrl: "", categoryId: "", proofImageUrl: "", proofCheckedAt: "",
    },
  });

  const type = watch("type");
  const code = (watch("code") || "").trim().toUpperCase();
  const discount = watch("discountLabel") || "";
  const isTop = watch("isTopCoupon");
  const cardImage = watch("cardImageUrl");
  const proofImage = watch("proofImageUrl");

  function pickSlug(): string {
    if (isEdit) return coupon!.slug;
    const base = `${store.slug}-discount-code`;
    if (!usedSlugs.includes(base)) return base;
    const tail = (code || discount).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || String(Date.now()).slice(-5);
    let slug = `${store.slug}-${tail}-discount-code`;
    for (let i = 2; usedSlugs.includes(slug); i++) slug = `${store.slug}-${tail}-${i}-discount-code`;
    return slug;
  }

  async function onSubmit(data: CouponInput) {
    const payload: CouponInput = {
      ...data,
      code: data.type === "CODE" ? (data.code || "").trim() : "",
      cardImageUrl: imageMode === "manual" ? data.cardImageUrl : "",
    };
    const result = coupon
      ? await updateCoupon(coupon.id, payload, { returnTo: `/admin/stores/${store.id}` })
      : await createCoupon(payload, { returnTo: `/admin/stores/${store.id}` });
    // Success redirects (throws); reaching here means it failed.
    if (result && !result.success) toast.error(result.error);
  }

  // Only the main code's description shows at the top of the store page, so
  // it is required there; for other codes an empty one is written for you.
  const descRequired = isMain || Boolean(watch("isFeatured"));
  function autoDescription(): string {
    const d = (watch("discountLabel") || "").trim();
    return watch("type") === "CODE" && code
      ? `استخدم كود ${code} للحصول على ${d ? `خصم ${d}` : "خصم"} عند التسوق من ${brand}. انسخ الكود وأدخله في خانة الخصم عند الدفع.`
      : `استفد من عرض ${d || "خاص"} عند التسوق من ${brand} مباشرة عبر رابط المتجر.`;
  }

  // Fill what the admin doesn't need to type before validation runs.
  function beforeSubmit(e: React.FormEvent) {
    if (!isEdit) setValue("slug", pickSlug());
    let desc = (watch("descriptionAr") || "").trim();
    if (!desc && !descRequired) {
      desc = autoDescription().slice(0, HERO_DESCRIPTION_MAX);
      setValue("descriptionAr", desc);
    }
    if ((descRequired && desc.length < 40) || desc.length > HERO_DESCRIPTION_MAX) {
      e.preventDefault();
      setMoreOpen(true);
      setError("descriptionAr", { message: desc.length < 40
        ? "الكود الرئيسي يحتاج وصفًا قصيرًا يظهر أعلى الصفحة (40 حرفًا على الأقل)"
        : `الوصف لازم يكون قصيرًا — ${HERO_DESCRIPTION_MAX} حرفًا كحد أقصى (حوالي 4 أسطر)` });
      return;
    }
    return handleSubmit(onSubmit)(e);
  }

  const tab = (on: boolean) =>
    `h-10 rounded-md px-4 text-sm font-extrabold transition-colors ${on ? "bg-surface text-primary shadow-sm" : "text-ink-muted hover:text-primary"}`;

  return (
    <form onSubmit={beforeSubmit} className="card border-2 border-primary p-5 sm:p-6 shadow-lg">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-ink">{isEdit ? `تعديل الكود ${coupon?.code ?? ""}` : "إضافة كود جديد"}</h3>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="icon-btn-sm border border-border">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-4 inline-flex gap-1 rounded-lg bg-surface-alt p-1">
            <button type="button" className={tab(type === "CODE")} onClick={() => setValue("type", "CODE", { shouldValidate: true })}>كود خصم</button>
            <button type="button" className={tab(type === "DEAL")} onClick={() => setValue("type", "DEAL", { shouldValidate: true })}>عرض بدون كود</button>
          </div>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {type === "CODE" && (
              <Field label="الكود" required error={errors.code?.message}>
                <Input {...register("code")} dir="ltr" placeholder="ABBBA1" className="font-mono text-lg tracking-widest uppercase" />
              </Field>
            )}
            <Field label="الخصم" required error={errors.discountLabel?.message} hint="مثال: 10% أو شحن مجاني">
              <Input {...register("discountLabel")} />
            </Field>
          </div>

          <Field label="العنوان" required error={errors.titleAr?.message} hint={titleTouched ? undefined : "مقترح من اسم المتجر — عدّله إذا أردت"}>
            <Input {...register("titleAr", { onChange: () => setTitleTouched(true) })} />
          </Field>
          {descRequired && (
            <Field label="وصف الكود" required error={errors.descriptionAr?.message}
              hint={`يظهر أعلى صفحة المتجر تحت العنوان. قصير: ${(watch("descriptionAr") || "").length} / ${HERO_DESCRIPTION_MAX} حرف (حوالي 4 أسطر).`}>
              <Textarea {...register("descriptionAr")} rows={3} maxLength={HERO_DESCRIPTION_MAX} />
            </Field>
          )}

          {/* Main code: everything visible. Other codes: tucked under «خيارات إضافية».
              Same element both ways so the form inputs never remount. */}
          <details open={moreOpen || descRequired} onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}
            className={descRequired ? "" : "mb-3 rounded-lg border border-border p-4"}>
            <summary className={descRequired ? "hidden" : "cursor-pointer text-sm font-bold text-ink"}>خيارات إضافية (اختياري)</summary>
            <div className={descRequired ? "" : "mt-3"}>
          {!descRequired && (
            <Field label="وصف الكود (اختياري)" error={errors.descriptionAr?.message}
              hint="اتركه فاضيًا ويُكتب تلقائيًا. وصف الكود الرئيسي فقط يظهر أعلى الصفحة.">
              <Textarea {...register("descriptionAr")} rows={2} maxLength={HERO_DESCRIPTION_MAX} />
            </Field>
          )}

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Field label="ينتهي في (اختياري)">
              <Input type="date" {...register("expiresAt")} />
            </Field>
            <Field label="رابط الأفلييت (اختياري)" error={errors.affiliateUrl?.message}>
              <Input {...register("affiliateUrl")} dir="ltr" placeholder="https://" />
            </Field>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <CheckboxField label="منشور" {...register("isPublished")} />
            <CheckboxField label="الكود الرئيسي (يظهر أولًا)" {...register("isFeatured")} />
            <CheckboxField label="ضمن «أفضل الكوبونات» بالرئيسية" {...register("isTopCoupon")} />
          </div>
          {isTop && (
            <Field label="الترتيب في «أفضل الكوبونات» (اختياري)">
              <Input type="number" min={1} {...register("topCouponOrder")} className="max-w-[140px]" />
            </Field>
          )}
            </div>
          </details>

          <details className="mt-3 rounded-lg border border-border p-4">
            <summary className="cursor-pointer text-sm font-bold text-ink">الشروط وإعدادات SEO (اختياري)</summary>
            <div className="mt-3">
              <Field label="الشروط"><Textarea {...register("termsAr")} rows={2} /></Field>
              <Field label="عنوان SEO" hint="70 حرف كحد أقصى"><Input {...register("seoTitleAr")} maxLength={70} /></Field>
              <Field label="وصف SEO" hint="160 حرف كحد أقصى"><Textarea {...register("seoDescriptionAr")} maxLength={160} rows={2} /></Field>
              {isEdit && (
                <Field label="الرابط (Slug)" error={errors.slug?.message} hint="لا تغيّره لكود منشور.">
                  <Input {...register("slug")} dir="ltr" />
                </Field>
              )}
              <Field label="Canonical URL" hint="اتركه فاضيًا في الغالب"><Input {...register("canonicalUrl")} dir="ltr" /></Field>
              <CheckboxField label="إخفاء عن محركات البحث (noindex)" {...register("noindex")} />
            </div>
          </details>
          {errors.slug?.message && !isEdit && <p className="mt-2 text-sm text-danger">{errors.slug.message}</p>}
        </div>

        {/* Live preview + image */}
        <div className="flex w-full flex-col gap-3 lg:w-[290px] lg:shrink-0">
          {type === "CODE" && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="mb-2 block text-sm font-extrabold text-ink">صورة الكود</span>
              <div className="mb-3 inline-flex gap-1 rounded-lg bg-surface-alt p-1">
                <button type="button" className={tab(imageMode === "auto")} onClick={() => setImageMode("auto")}>تلقائية</button>
                <button type="button" className={tab(imageMode === "manual")} onClick={() => setImageMode("manual")}>رفع يدوي</button>
              </div>
              {imageMode === "auto" ? (
                <p className="text-sm leading-7 text-ink-muted">تُصمَّم بالتصميم المعتمد وتظهر خلال 5–15 دقيقة من الحفظ، وتتحدّث وحدها إذا غيّرت الكود.</p>
              ) : (
                <>
                  <ImageUploadField value={cardImage || ""} directKind="coupon-card" uploadAction={uploadCouponCardImage}
                    onChange={(url) => setValue("cardImageUrl", url, { shouldValidate: true, shouldDirty: true })}
                    replaceHint="اضغط لرفع صورة بديلة"
                    successMessage="تم حفظ صورة الكود" />
                  <p className="mt-2 text-xs leading-6 text-ink-muted">الصورة اليدوية لها الأولوية ولا تُستبدل تلقائيًا.</p>
                </>
              )}
            </div>
          )}
          {type === "CODE" && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="mb-1 block text-sm font-extrabold text-ink">صورة الإثبات (اختياري)</span>
              <p className="mb-3 text-xs leading-6 text-ink-muted">
                سكرين شوت من سلة المتجر والكود مطبّق والخصم ظاهر. تظهر للزوار تحت صورة الكود، ولا تظهر في صور جوجل. تنحذف تلقائيًا إذا غيّرت الكود.
              </p>
              <ImageUploadField value={proofImage || ""} directKind="coupon-proof" uploadAction={uploadCouponCardImage}
                onChange={(url) => {
                  setValue("proofImageUrl", url, { shouldValidate: true, shouldDirty: true });
                  setValue("proofCheckedAt", new Date().toISOString().slice(0, 10), { shouldDirty: true });
                }}
                replaceHint="اضغط لرفع سكرين شوت بديل"
                successMessage="تم رفع صورة الإثبات" />
              {proofImage && (
                <>
                  <Field label="تاريخ التجربة" error={errors.proofCheckedAt?.message}>
                    <Input type="date" {...register("proofCheckedAt")} />
                  </Field>
                  <button type="button" className="text-sm text-ink-muted underline"
                    onClick={() => { setValue("proofImageUrl", "", { shouldDirty: true }); setValue("proofCheckedAt", "", { shouldDirty: true }); }}>
                    إزالة صورة الإثبات
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-3 border-t border-border pt-4">
        <Button type="submit" loading={isSubmitting}>{isEdit ? "حفظ الكود" : "إضافة الكود"}</Button>
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
      </div>
    </form>
  );
}
