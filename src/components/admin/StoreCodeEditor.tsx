"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { couponSchema, type CouponInput } from "@/lib/validations";
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
  onClose: () => void;
}

function shortDiscount(label: string) {
  const t = label.trim();
  if (!t) return "";
  return /\d/.test(t) ? `خصم ${t.replace(/^خصم\s*/, "")}` : t;
}

/**
 * Add / edit one code inside the store workspace. Same server actions and
 * validation as the full coupon form; store, URL and slug are filled in.
 */
export function StoreCodeEditor({ store, coupon, usedSlugs, onClose }: StoreCodeEditorProps) {
  const isEdit = Boolean(coupon);
  const [titleTouched, setTitleTouched] = useState(isEdit);
  const [imageMode, setImageMode] = useState<"auto" | "manual">(coupon?.cardImageUrl ? "manual" : "auto");

  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon ? {
      storeId: coupon.storeId, categoryId: coupon.categoryId || "", slug: coupon.slug, cardImageUrl: coupon.cardImageUrl || "",
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
      title: "", titleAr: `كود خصم ${store.name}`, description: "", descriptionAr: "",
      isPublished: true, isVerified: false, isFeatured: false, isTopCoupon: false, noindex: false,
      cardImageUrl: "", categoryId: "",
    },
  });

  const type = watch("type");
  const code = (watch("code") || "").trim().toUpperCase();
  const discount = watch("discountLabel") || "";
  const isTop = watch("isTopCoupon");
  const cardImage = watch("cardImageUrl");

  function pickSlug(): string {
    if (isEdit) return coupon!.slug;
    const base = `${store.slug}-discount-code`;
    if (!usedSlugs.includes(base)) return base;
    const tail = (code || discount).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || String(Date.now()).slice(-5);
    let slug = `${store.slug}-${tail}`;
    for (let i = 2; usedSlugs.includes(slug); i++) slug = `${store.slug}-${tail}-${i}`;
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

  // Fill what the admin doesn't need to type before validation runs.
  function beforeSubmit(e: React.FormEvent) {
    if (!isEdit) setValue("slug", pickSlug());
    if (!(watch("descriptionAr") || "").trim()) {
      const d = discount.trim();
      setValue("descriptionAr", type === "CODE" && code
        ? `استخدم كود خصم ${store.name} ${code}${d ? ` واحصل على ${shortDiscount(d)}` : ""} عند الشراء من متجر ${store.name}.`
        : `${d ? `${shortDiscount(d)} ` : ""}عرض من متجر ${store.name} بدون الحاجة لكود.`);
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
          <Field label="وصف الكود" error={errors.descriptionAr?.message}
            hint="وصف الكود الرئيسي هو الوصف الذي يظهر أعلى الصفحة تحت العنوان. اتركه فارغًا ونكتبه تلقائيًا.">
            <Textarea {...register("descriptionAr")} rows={3} />
          </Field>

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
          <span className="text-sm font-bold text-ink-muted">كيف يظهر في الصفحة</span>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-md">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-ink">{type === "CODE" ? "كود خصم فعال لجميع العملاء" : "عرض فعال لجميع العملاء"}</span>
              {discount.trim() && <span className="badge-accent">{shortDiscount(discount)}</span>}
            </div>
            {type === "CODE" ? (
              <div className="flex h-[52px] gap-1.5 rounded-xl border-[1.5px] border-dashed border-border-strong bg-surface-alt p-1.5">
                <span dir="ltr" className="flex flex-1 items-center justify-center font-mono text-lg font-bold tracking-[0.16em] text-primary">{code || "CODE"}</span>
                <span className="flex w-[84px] items-center justify-center rounded-lg bg-accent text-sm font-extrabold text-white">نسخ</span>
              </div>
            ) : (
              <div className="flex h-[52px] items-center justify-center rounded-xl bg-accent text-sm font-extrabold text-white">الذهاب إلى العرض</div>
            )}
          </div>

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
        </div>
      </div>

      <div className="mt-5 flex gap-3 border-t border-border pt-4">
        <Button type="submit" loading={isSubmitting}>{isEdit ? "حفظ الكود" : "إضافة الكود"}</Button>
        <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
      </div>
    </form>
  );
}
