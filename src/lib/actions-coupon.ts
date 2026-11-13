"use server";

import { storeHubPath } from "@/lib/store-hub";
import { after } from "next/server";
import { generateCouponImageSafely, generateCouponImageNow } from "@/lib/generate-coupon-image";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIndexNow } from "@/lib/indexnow";
import { couponSchema, type CouponInput } from "@/lib/validations";
import type { ActionResult } from "@/lib/actions-store";
import { revalidateCategoriesForStore } from "@/lib/store-categories";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("غير مصرّح");
  return session;
}

// Store workspace (/admin/stores/[id]) saves codes in place and returns there.
function safeAdminReturn(returnTo: string | undefined, fallback: string): string {
  return returnTo && /^\/admin\/stores\/[A-Za-z0-9_-]+$/.test(returnTo) ? returnTo : fallback;
}

/**
 * Proof screenshot fields. A form without them (the old coupon form) keeps the
 * saved proof; a changed code/offer drops a proof that was not re-uploaded,
 * because the old screenshot no longer shows the current code.
 */
function proofData(
  data: CouponInput,
  old: { proofImageUrl: string | null; proofCheckedAt: Date | null } | null,
  offerChanged: boolean,
): { proofImageUrl: string | null; proofCheckedAt: Date | null } {
  if (data.proofImageUrl === undefined) {
    return offerChanged || !old
      ? { proofImageUrl: null, proofCheckedAt: null }
      : { proofImageUrl: old.proofImageUrl, proofCheckedAt: old.proofCheckedAt };
  }
  const url = data.proofImageUrl || null;
  if (!url || (offerChanged && url === (old?.proofImageUrl ?? null))) return { proofImageUrl: null, proofCheckedAt: null };
  const date = data.proofCheckedAt ? new Date(`${data.proofCheckedAt}T12:00:00Z`) : null;
  return { proofImageUrl: url, proofCheckedAt: date && !Number.isNaN(date.getTime()) ? date : new Date() };
}

export async function createCoupon(data: CouponInput, opts?: { returnTo?: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };
  // A manual image is optional: without one, GitHub Actions generates the card
  // image for the code automatically (scripts/generate-coupon-images.tsx).

  const existing = await db.coupon.findUnique({
    where: { storeId_slug: { storeId: parsed.data.storeId, slug: parsed.data.slug } },
  });
  if (existing) return { success: false, error: "هذا الرابط مستخدم بالفعل لكوبون آخر بنفس المتجر" };

  const store = await db.store.findUnique({ where: { id: parsed.data.storeId } });
  if (!store) return { success: false, error: "المتجر المختار غير موجود" };

  const created = await db.coupon.create({
    data: {
      ...parsed.data,
      // لو الأدمن ما اختارش تصنيف صريح، بيرث تصنيف المتجر تلقائيًا
      // (يفضل قابل للتغيير يدويًا لو الكوبون فعلًا مختلف عن تصنيف متجره)
      categoryId: parsed.data.categoryId || null,
      code: parsed.data.code || null,
      cardImageUrl: parsed.data.cardImageUrl || null,
      ...proofData(parsed.data, null, false),
      terms: parsed.data.terms || null,
      termsAr: parsed.data.termsAr || null,
      affiliateUrl: parsed.data.affiliateUrl || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      topCouponOrder: parseTopCouponOrder(parsed.data.topCouponOrder),
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
      lastCheckedAt: new Date(),
      isVerified: false, // Verification must be an explicit per-coupon action after testing.
      manuallyVerifiedAt: null,
    },
  });

  // النشر التلقائي: صفحة الكوبون + صفحة المتجر (اللي تحتوي قائمة الكوبونات) + السايتماب
  // تتحدث كلها فورًا، بدون أي كود إضافي — بالضبط زي ما طلب قسم 28 بالبرومبت
  await revalidateCouponPaths(store.id, store.slug, parsed.data.slug, parsed.data.categoryId);
  after(() => generateCouponImageSafely(created.id));
  if (created.isPublished && !created.noindex && store.isPublished && !store.noindex
      && (!created.expiresAt || created.expiresAt >= new Date())) {
    await notifyIndexNow([`/store/${store.slug}`, `/store/${store.slug}/coupon/${created.slug}`]);
  }
  redirect(safeAdminReturn(opts?.returnTo, "/admin/coupons"), RedirectType.replace);
}

/**
 * A saved SEO title/description that mentions the OLD code would keep showing
 * it in Google after the code changes (happened: ABBBA1 vs CM2648). Swap the
 * old code for the new one wherever it appears.
 */
function swapCode(text: string | null | undefined, oldCode: string | null | undefined, newCode: string | null | undefined): string | null {
  if (!text) return text ?? null;
  const from = oldCode?.trim();
  const to = newCode?.trim();
  if (!from || !to || from.toUpperCase() === to.toUpperCase()) return text;
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "gi"), to);
}

export async function updateCoupon(id: string, data: CouponInput, opts?: { returnTo?: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const oldCoupon = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!oldCoupon) return { success: false, error: "الكوبون غير موجود" };

  const existing = await db.coupon.findFirst({
    where: { storeId: parsed.data.storeId, slug: parsed.data.slug, id: { not: id } },
  });
  if (existing) return { success: false, error: "هذا الرابط مستخدم بالفعل لكوبون آخر بنفس المتجر" };

  const store = await db.store.findUnique({ where: { id: parsed.data.storeId } });
  if (!store) return { success: false, error: "المتجر المختار غير موجود" };
  if (!parsed.data.isPublished && oldCoupon.isPublished && await isHubCoupon(oldCoupon.storeId, oldCoupon.slug)) {
    return { success: false, error: HUB_PROTECTED_ERROR };
  }

  // A different code, offer or merchant invalidates any earlier verification.
  // Never trust the isVerified checkbox value submitted from the edit form.
  const offerChanged = oldCoupon.storeId !== parsed.data.storeId
    || oldCoupon.type !== parsed.data.type
    || (oldCoupon.code || "") !== (parsed.data.code || "")
    || oldCoupon.discountLabel !== parsed.data.discountLabel;
  await db.coupon.update({
    where: { id },
    data: {
      ...parsed.data,
      cardImageUrl: offerChanged && parsed.data.cardImageUrl === (oldCoupon.cardImageUrl || "") ? null : (parsed.data.cardImageUrl || null),
      ...proofData(parsed.data, oldCoupon, offerChanged),
      isVerified: offerChanged ? false : oldCoupon.isVerified,
      manuallyVerifiedAt: offerChanged ? null : oldCoupon.manuallyVerifiedAt,
      categoryId: parsed.data.categoryId || null,
      code: parsed.data.code || null,
      terms: parsed.data.terms || null,
      termsAr: parsed.data.termsAr || null,
      affiliateUrl: parsed.data.affiliateUrl || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      topCouponOrder: parseTopCouponOrder(parsed.data.topCouponOrder),
      seoTitle: swapCode(parsed.data.seoTitle || null, oldCoupon.code, parsed.data.code),
      seoDescription: swapCode(parsed.data.seoDescription || null, oldCoupon.code, parsed.data.code),
      seoTitleAr: swapCode(parsed.data.seoTitleAr || null, oldCoupon.code, parsed.data.code),
      seoDescriptionAr: swapCode(parsed.data.seoDescriptionAr || null, oldCoupon.code, parsed.data.code),
    },
  });

  // Redirect تلقائي لو تغيّر السلج أو المتجر (رابط الكوبون كامل يتغيّر بالحالتين)
  const oldPath = `/store/${oldCoupon.store.slug}/coupon/${oldCoupon.slug}`;
  const newPath = `/store/${store.slug}/coupon/${parsed.data.slug}`;
  if (oldPath !== newPath) {
    await db.redirect.create({ data: { fromPath: oldPath, toPath: newPath, statusCode: 301 } }).catch(() => {});
    revalidatePath(oldPath);
    if (oldCoupon.store.id === store.id) {
      await db.store.updateMany({ where: { id: store.id, hubCouponSlug: oldCoupon.slug }, data: { hubCouponSlug: parsed.data.slug } });
    } else {
      await releaseHubIfCoupon(oldCoupon.store.id, oldCoupon.slug);
    }
  }
  if (!parsed.data.isPublished) await releaseHubIfCoupon(store.id, parsed.data.slug);

  await revalidateCouponPaths(store.id, store.slug, parsed.data.slug, parsed.data.categoryId);
  after(() => generateCouponImageSafely(id));
  await notifyIndexNow([oldPath, newPath, `/store/${oldCoupon.store.slug}`, `/store/${store.slug}`]);
  redirect(safeAdminReturn(opts?.returnTo, "/admin/coupons"), RedirectType.replace);
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!coupon) return { success: false, error: "الكوبون غير موجود" };
  if (await isHubCoupon(coupon.store.id, coupon.slug)) return { success: false, error: HUB_PROTECTED_ERROR };

  await db.coupon.delete({ where: { id } });
  await releaseHubIfCoupon(coupon.store.id, coupon.slug);
  await revalidateCouponPaths(coupon.store.id, coupon.store.slug, coupon.slug, coupon.categoryId);
  await notifyIndexNow([`/store/${coupon.store.slug}/coupon/${coupon.slug}`, `/store/${coupon.store.slug}`]);
  return { success: true };
}

export async function toggleCouponPublish(id: string, isPublished: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isPublished) {
    const current = await db.coupon.findUnique({ where: { id }, select: { storeId: true, slug: true } });
    if (current && await isHubCoupon(current.storeId, current.slug)) return { success: false, error: HUB_PROTECTED_ERROR };
  }
  const coupon = await db.coupon.update({ where: { id }, data: { isPublished }, include: { store: true } });
  if (!isPublished) await releaseHubIfCoupon(coupon.store.id, coupon.slug);
  await revalidateCouponPaths(coupon.store.id, coupon.store.slug, coupon.slug, coupon.categoryId);
  await notifyIndexNow([`/store/${coupon.store.slug}/coupon/${coupon.slug}`, `/store/${coupon.store.slug}`]);
  return { success: true };
}

// Verification is deliberately one coupon at a time, only after an admin has
// tested the offer on the merchant's checkout page. No bulk date-refresh action.
export async function markCouponVerified(id: string, confirmedTest: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!confirmedTest) return { success: false, error: "يجب تأكيد تجربة الكود قبل اعتماده" };
  const existing = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!existing) return { success: false, error: "الكوبون غير موجود" };
  if (!existing.isPublished || !existing.store.isPublished)
    return { success: false, error: "لا يمكن توثيق كوبون غير منشور" };
  if (existing.expiresAt && existing.expiresAt.getTime() <= Date.now())
    return { success: false, error: "انتهت صلاحية هذا الكوبون؛ لا يمكن توثيقه" };
  const timestamp = new Date();
  await db.coupon.update({
    where: { id },
    data: { isVerified: true, lastCheckedAt: timestamp, manuallyVerifiedAt: timestamp },
  });
  await revalidateCouponPaths(existing.store.id, existing.store.slug, existing.slug, existing.categoryId);
  await notifyIndexNow([`/store/${existing.store.slug}/coupon/${existing.slug}`, `/store/${existing.store.slug}`]);
  return { success: true };
}

// A failed real-world test can revoke a verification without deleting its URL.
export async function markCouponUnverified(id: string): Promise<ActionResult> {
  await requireAdmin();
  const existing = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!existing) return { success: false, error: "الكوبون غير موجود" };
  await db.coupon.update({
    where: { id },
    data: { isVerified: false, manuallyVerifiedAt: null },
  });
  await revalidateCouponPaths(existing.store.id, existing.store.slug, existing.slug, existing.categoryId);
  await notifyIndexNow([`/store/${existing.store.slug}/coupon/${existing.slug}`, `/store/${existing.store.slug}`]);
  return { success: true };
}

// تبديل سريع من قائمة الكوبونات لإضافة/إزالة كوبون من قسم "أفضل الكوبونات"
// بالرئيسية، بدون فتح فورم التعديل الكامل — الترتيب اليدوي (topCouponOrder)
// يبقى من الفورم فقط، هذا الزر بس للتشغيل/الإيقاف.
export async function toggleCouponTopPick(id: string, isTopCoupon: boolean) {
  await requireAdmin();
  const coupon = await db.coupon.update({ where: { id }, data: { isTopCoupon }, include: { store: true } });
  await revalidateCouponPaths(coupon.store.id, coupon.store.slug, coupon.slug);
}

// "" (فاضي) → null. رقم صحيح → نفسه. غير كده (نص مش رقم) → null بهدوء
// بدل ما نرمي خطأ على قيمة غير متوقعة بحقل اختياري بحت.
function parseTopCouponOrder(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

// كوبون واحد بيظهر بصفحته + صفحة متجره + أي تصنيف يتبعه متجره (أو تصنيفه
// الصريح) + قائمة /coupons + السايتماب. بدون revalidate لكل هالأماكن،
// حذف/إلغاء نشر كوبون يخلي روابطه تفضل معروضة بصفحة التصنيف كرابط ميت
// لحد ما ينتهي revalidate=3600 لوحده (نفس مشكلة revalidateStorePaths،
// راجع التعليق هناك بـ actions-store.ts).
async function revalidateCouponPaths(storeId: string, storeSlug: string, couponSlug: string, explicitCategoryId?: string | null) {
  // Invalidate cached public listing rows AND total-page count after admin writes.
  revalidateTag("public-coupons-list");
  revalidatePath("/");
  revalidatePath("/coupons");
  // النوع الصريح "page" مقصود — راجع نفس التعليق بـ revalidateStorePaths
  // بـ actions-store.ts: صفحة رجّعت notFound() مرة (كوبون/متجر كان غير
  // منشور) ممكن تفضل عالقة على 404 بالكاش بدون النوع الصريح.
  revalidatePath(`/store/${storeSlug}`);
  revalidatePath(`/store/${storeSlug}/coupon/${couponSlug}`);
  // Every code of a store is shown on its single hub page (src/lib/store-hub.ts).
  const hubPath = await hubPathForStoreId(storeId);
  if (hubPath) revalidatePath(hubPath);
  revalidatePath("/admin/coupons");
  revalidatePath("/sitemap.xml");
  await revalidateCategoriesForStore(storeId);
  // كوبون بتصنيف صريح مختلف عن تصنيفات متجره (override يدوي) — تصنيفات
  // المتجر فوق ما تغطّي هالحالة، فنمسح كاش تصنيفه الصريح كمان لو موجود.
  if (explicitCategoryId) {
    const category = await db.category.findUnique({ where: { id: explicitCategoryId }, select: { slug: true } });
    if (category) revalidatePath(`/category/${category.slug}`);
  }
}

// ------------------------------------------------------------
// الصفحة الموحدة: إبقاء رابط الصفحة الموحدة للمتجر صحيحًا عند تغيير
// رابط كوبونها أو حذفه أو إلغاء نشره (راجع src/lib/store-hub.ts).
// ------------------------------------------------------------
async function hubPathForStoreId(storeId: string): Promise<string | null> {
  const store = await db.store.findUnique({ where: { id: storeId }, select: { slug: true, hubCouponSlug: true } });
  return store ? storeHubPath(store) : null;
}

/** The hub coupon was removed from its store: the hub moves back to the store URL. */
// The coupon whose URL hosts the store page carries its Google ranking. It is
// never hidden or deleted from the admin: the admin edits its code instead
// (hiding it moved three ranked pages to new URLs on 2026-11-05).
const HUB_PROTECTED_ERROR = "هذا الكود يستضيف صفحة المتجر في جوجل — لا تحذفه ولا تخفيه. لتغيير الكود اضغط «تعديل» وضع الكود الجديد مكانه.";

async function isHubCoupon(storeId: string, couponSlug: string) {
  return (await db.store.count({ where: { id: storeId, hubCouponSlug: couponSlug } })) > 0;
}

async function releaseHubIfCoupon(storeId: string, couponSlug: string) {
  await db.store.updateMany({ where: { id: storeId, hubCouponSlug: couponSlug }, data: { hubCouponSlug: null } });
}

/**
 * "إنشاء صورة بالكود الحالي": replaces a historical image (which may show an
 * old code) with a freshly generated one for the current code. Explicit only —
 * old images are never replaced automatically because they may rank in Google.
 */
export async function regenerateCouponImage(id: string): Promise<ActionResult> {
  await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!coupon) return { success: false, error: "الكوبون غير موجود" };
  if (coupon.cardImageUrl) return { success: false, error: "لهذا الكود صورة يدوية — احذفها أولًا من التعديل" };
  if (coupon.type !== "CODE" || !coupon.code?.trim()) return { success: false, error: "العروض بدون كود ليس لها صورة" };
  await db.coupon.update({ where: { id }, data: { autoImageCode: null } });
  try {
    await generateCouponImageNow(id);
  } catch (error) {
    console.error("[coupon-image] regenerate failed:", error);
    return { success: false, error: "تعذّر توليد الصورة الآن — ستتولد تلقائيًا خلال دقائق" };
  }
  await revalidateCouponPaths(coupon.store.id, coupon.store.slug, coupon.slug, coupon.categoryId);
  return { success: true };
}

/**
 * «اجعله الكود الرئيسي»: makes another code of the store its main code.
 *
 * When the store page lives on a coupon URL (hubCouponSlug), the URL must not
 * move (it carries the Google ranking), so the two coupons swap their offer
 * content instead: the hub coupon takes this code, discount, title, description,
 * dates and verification; this coupon takes the old ones. The hub's image is
 * regenerated for the new code. When the page lives on /store/<slug>, the code
 * is simply moved to the top (featured).
 */
export async function promoteToMainCode(id: string): Promise<ActionResult> {
  await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!coupon) return { success: false, error: "الكوبون غير موجود" };
  if (!coupon.isPublished) return { success: false, error: "انشر الكود أولًا ثم اجعله الرئيسي" };
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) return { success: false, error: "هذا الكود منتهٍ — لا يمكن جعله الرئيسي" };

  const store = coupon.store;
  const hub = store.hubCouponSlug
    ? await db.coupon.findFirst({ where: { storeId: store.id, slug: store.hubCouponSlug } })
    : null;

  if (!hub) {
    await db.$transaction([
      db.coupon.updateMany({ where: { storeId: store.id, id: { not: id } }, data: { isFeatured: false } }),
      // Regenerate so the promoted code takes over the page's stable image URL.
      db.coupon.update({ where: { id }, data: { isFeatured: true, ...(coupon.cardImageUrl ? {} : { autoImageUrl: null, autoImageCode: null }) } }),
    ]);
    if (!coupon.cardImageUrl) after(() => generateCouponImageSafely(id));
  } else if (hub.id !== id) {
    const offer = (c: typeof coupon | typeof hub) => ({
      type: c.type, code: c.code, discountLabel: c.discountLabel,
      title: c.title, titleAr: c.titleAr, description: c.description, descriptionAr: c.descriptionAr,
      terms: c.terms, termsAr: c.termsAr, affiliateUrl: c.affiliateUrl, expiresAt: c.expiresAt,
      isVerified: c.isVerified, manuallyVerifiedAt: c.manuallyVerifiedAt, lastCheckedAt: c.lastCheckedAt,
      cardImageUrl: c.cardImageUrl,
    });
    await db.$transaction([
      db.coupon.update({
        where: { id: hub.id },
        // Manual image travels with the code; otherwise regenerate for the hub's URL.
        data: {
          ...offer(coupon), isPublished: true, isFeatured: true, autoImageUrl: null, autoImageCode: null,
          // The hub keeps its own SEO fields (ranked URL) — only the code in them follows.
          seoTitle: swapCode(hub.seoTitle, hub.code, coupon.code),
          seoTitleAr: swapCode(hub.seoTitleAr, hub.code, coupon.code),
          seoDescription: swapCode(hub.seoDescription, hub.code, coupon.code),
          seoDescriptionAr: swapCode(hub.seoDescriptionAr, hub.code, coupon.code),
        },
      }),
      db.coupon.update({
        where: { id: coupon.id },
        data: { ...offer(hub), isFeatured: false, autoImageUrl: hub.autoImageUrl, autoImageCode: hub.autoImageCode },
      }),
    ]);
    after(() => generateCouponImageSafely(hub.id));
  }

  await revalidateCouponPaths(store.id, store.slug, coupon.slug, coupon.categoryId);
  if (hub) revalidatePath(`/store/${store.slug}/coupon/${hub.slug}`);
  return { success: true };
}
