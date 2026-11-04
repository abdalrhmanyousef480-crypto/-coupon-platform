"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { newStoreWithCodeSchema, type NewStoreWithCodeInput } from "@/lib/validations";
import { createStoreWithCode } from "@/lib/actions-store";
import { toSlug } from "@/lib/utils";
import { Field, Input, Textarea, CheckboxField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

/** Slug from the name; Arabic-only names fall back to the website's domain (gheem.sa → gheem). */
function suggestSlug(name: string, website: string): string {
  const fromName = toSlug(name);
  if (fromName.length >= 2) return fromName;
  try {
    const host = new URL(website).hostname.replace(/^www\./, "");
    return toSlug(host.split(".")[0] || "");
  } catch {
    return "";
  }
}

function shortDiscount(label: string) {
  const t = label.trim();
  if (!t) return "";
  return /\d/.test(t) ? `خصم ${t.replace(/^خصم\s*/, "")}` : t;
}

/**
 * New store + its first code in one form. Title, coupon slug, store URL and the
 * code description are filled automatically from the store's details.
 */
export function NewStoreForm({ categories }: { categories: { id: string; nameAr: string }[] }) {
  const [slugTouched, setSlugTouched] = useState(false);
  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<NewStoreWithCodeInput>({
    resolver: zodResolver(newStoreWithCodeSchema),
    defaultValues: {
      name: "", slug: "", logoUrl: "", website: "", categoryIds: [], descriptionAr: "",
      isPublished: true, isFeatured: false,
      codeType: "CODE", code: "", discountLabel: "", expiresAt: "", affiliateUrl: "", codeDescriptionAr: "",
    },
  });

  const name = watch("name") || "";
  const slug = watch("slug") || "";
  const website = watch("website") || "";
  const logoUrl = watch("logoUrl") || "";
  const categoryIds = watch("categoryIds") ?? [];
  const codeType = watch("codeType");
  const code = (watch("code") || "").trim().toUpperCase();
  const discount = watch("discountLabel") || "";

  function syncSlug(nextName: string, nextWebsite: string) {
    if (!slugTouched) setValue("slug", suggestSlug(nextName, nextWebsite), { shouldValidate: Boolean(slug) });
  }

  function toggleCategory(id: string) {
    const next = new Set(categoryIds);
    if (!next.delete(id)) next.add(id);
    setValue("categoryIds", Array.from(next), { shouldValidate: true });
  }

  async function onSubmit(data: NewStoreWithCodeInput) {
    const result = await createStoreWithCode({ ...data, code: data.codeType === "CODE" ? (data.code || "").trim() : "" });
    // Success redirects to the new store's screen; reaching here means it failed.
    if (result && !result.success) toast.error(result.error);
  }

  const tab = (on: boolean) =>
    `h-10 rounded-md px-4 text-sm font-extrabold transition-colors ${on ? "bg-surface text-primary shadow-sm" : "text-ink-muted hover:text-primary"}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-6 xl:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
          {/* Store */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-extrabold text-ink">١. المتجر</h2>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Field label="اسم المتجر" required error={errors.name?.message}>
                <Input {...register("name", { onChange: (e) => syncSlug(e.target.value, website) })} placeholder="مثال: مناديل غيم" />
              </Field>
              <Field label="موقع المتجر" required error={errors.website?.message}>
                <Input {...register("website", { onChange: (e) => syncSlug(name, e.target.value) })} dir="ltr" placeholder="https://www.store.com" />
              </Field>
            </div>
            <Field label="رابط الصفحة (Slug)" required error={errors.slug?.message}
              hint={slugTouched ? "أحرف إنجليزية صغيرة وأرقام وشرطات فقط. لا تغيّره بعد النشر." : "يُكتب تلقائيًا من الاسم أو من دومين الموقع — عدّله إذا أردت."}>
              <div dir="ltr" className="flex items-stretch overflow-hidden rounded-md border border-border-strong focus-within:border-primary">
                <span className="flex items-center bg-surface-alt px-3 text-sm text-ink-muted">couponsnoor.com/store/</span>
                <input {...register("slug", { onChange: () => setSlugTouched(true) })}
                  className="min-w-0 flex-1 bg-surface px-3 py-2.5 font-mono text-[15px] outline-none" placeholder="gheem" />
              </div>
            </Field>
            <Field label="شعار المتجر" required error={errors.logoUrl?.message}>
              <ImageUploadField value={logoUrl} directKind="store-logo"
                onChange={(url) => setValue("logoUrl", url, { shouldValidate: true })} />
              <input type="hidden" {...register("logoUrl")} />
            </Field>
            <Field label="التصنيفات" required error={errors.categoryIds?.message ?? errors.categoryIds?.root?.message}>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = categoryIds.includes(c.id);
                  return (
                    <button key={c.id} type="button" aria-pressed={on} onClick={() => toggleCategory(c.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${on ? "bg-primary text-white" : "border border-border-strong text-ink-muted hover:border-primary hover:text-primary"}`}>
                      {c.nameAr}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="عن المتجر" required error={errors.descriptionAr?.message} hint="يظهر في قسم «عن المتجر» أسفل الصفحة.">
              <Textarea {...register("descriptionAr")} rows={3} placeholder="ماذا يبيع المتجر، الشحن، طرق الدفع…" />
            </Field>
          </section>

          {/* First code */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-extrabold text-ink">٢. الكود</h2>
            <div className="mb-4 inline-flex gap-1 rounded-lg bg-surface-alt p-1">
              <button type="button" className={tab(codeType === "CODE")} onClick={() => setValue("codeType", "CODE", { shouldValidate: true })}>كود خصم</button>
              <button type="button" className={tab(codeType === "DEAL")} onClick={() => setValue("codeType", "DEAL", { shouldValidate: true })}>عرض بدون كود</button>
            </div>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {codeType === "CODE" && (
                <Field label="الكود" required error={errors.code?.message}>
                  <Input {...register("code")} dir="ltr" placeholder="ABBBA1" className="font-mono text-lg uppercase tracking-widest" />
                </Field>
              )}
              <Field label="الخصم" required error={errors.discountLabel?.message} hint="مثال: 10% أو شحن مجاني">
                <Input {...register("discountLabel")} />
              </Field>
              <Field label="ينتهي في (اختياري)">
                <Input type="date" {...register("expiresAt")} />
              </Field>
              <Field label="رابط الأفلييت (اختياري)" error={errors.affiliateUrl?.message}>
                <Input {...register("affiliateUrl")} dir="ltr" placeholder="https://" />
              </Field>
            </div>
            <Field label="الوصف أعلى الصفحة (اختياري)" hint="اتركه فارغًا ونكتبه تلقائيًا من الكود والخصم.">
              <Textarea {...register("codeDescriptionAr")} rows={2} />
            </Field>
          </section>
        </div>

        {/* Live summary */}
        <aside className="flex w-full flex-col gap-4 xl:sticky xl:top-6 xl:w-[340px] xl:shrink-0">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-bold text-ink-muted">كيف تظهر الصفحة</h2>
            <div className="rounded-xl bg-primary p-4 text-white">
              <p className="text-lg font-extrabold leading-snug">{codeType === "CODE" ? `كود خصم ${name || "اسم المتجر"}` : `عرض ${name || "اسم المتجر"}`}</p>
              <p dir="ltr" className="mt-1 truncate text-end text-xs text-white/70">/store/{slug || "slug"}</p>
            </div>
            <div className="mt-3 rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-ink">{codeType === "CODE" ? "كود خصم فعال لجميع العملاء" : "عرض فعال لجميع العملاء"}</span>
                {discount.trim() && <span className="badge-accent">{shortDiscount(discount)}</span>}
              </div>
              {codeType === "CODE" ? (
                <div className="flex h-[50px] gap-1.5 rounded-xl border-[1.5px] border-dashed border-border-strong bg-surface-alt p-1.5">
                  <span dir="ltr" className="flex flex-1 items-center justify-center font-mono text-lg font-bold tracking-[0.16em] text-primary">{code || "CODE"}</span>
                  <span className="flex w-[80px] items-center justify-center rounded-lg bg-accent text-sm font-extrabold text-white">نسخ</span>
                </div>
              ) : (
                <div className="flex h-[50px] items-center justify-center rounded-xl bg-accent text-sm font-extrabold text-white">الذهاب إلى العرض</div>
              )}
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-sm leading-6 text-ink-muted">
              <li>• العنوان ورابط الكود ورابط المتجر تُكتب تلقائيًا.</li>
              {codeType === "CODE" && <li>• صورة الكود تُصمَّم تلقائيًا وتظهر خلال دقائق.</li>}
              <li>• تضيف أكوادًا أخرى من شاشة المتجر بعد الحفظ.</li>
            </ul>
          </section>
          <div className="card flex flex-col gap-1 p-5">
            <CheckboxField label="منشور على الموقع" {...register("isPublished")} />
            <CheckboxField label="مميز بالرئيسية" {...register("isFeatured")} />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">إضافة المتجر والكود</Button>
        </aside>
      </div>
    </form>
  );
}
