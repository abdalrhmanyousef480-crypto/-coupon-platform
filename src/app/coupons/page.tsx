import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { buildMetadata, collectionPageJsonLd, SITE_URL } from "@/lib/seo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponsExplorer } from "@/components/public/CouponsExplorer";
import {
  COUPONS_PAGE_SIZE,
  SEARCH_RESULT_LIMIT,
  COUPON_PRIORITY_ORDER,
  COUPON_INCLUDE,
  couponsWhere,
  type PublicCouponWithStore,
} from "@/lib/coupons-query";
import type { Metadata } from "next";

type CouponsSearchParams = { q?: string; page?: string };

// أي قيمة غير صالحة (فاضية، سالبة، صفر، نص) بترجع 1 — أول صفحة نظيفة
// دايمًا صالحة، ما فيه داعي لأي معالجة خاصة على قيم شاذة بالـ query.
function parsePageParam(page?: string): number {
  const n = Number.parseInt(page ?? "1", 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

// عدد صفحات الترقيم الفعلي المتاح حاليًا لكوبونات منشورة. محدود بعدد
// الكوبونات الحقيقي (مش عدد لا نهائي قابل للزحف).
async function getTotalPages(): Promise<number> {
  const totalCount = await db.coupon.count({ where: couponsWhere() });
  return Math.max(1, Math.ceil(totalCount / COUPONS_PAGE_SIZE));
}

export async function generateMetadata({
  searchParams,
}: { searchParams: Promise<CouponsSearchParams> }): Promise<Metadata> {
  const { q, page } = await searchParams;
  const isSearch = !!q?.trim();
  const pageNum = parsePageParam(page);

  // وضع البحث (?q=...) canonical دايمًا لـ /coupons النظيفة — ما بنخليه
  // يتحول لصفحة SEO مستقلة بعدد لا نهائي من الاحتمالات. صفحة 1 (بدون
  // ?page= أو ?page=1) canonical لنفسها بدون باراميتر. كل صفحة تالية
  // (2 فأكثر) canonical لرابطها الخاص فيها — مش مجمّعة كلها على /coupons،
  // عشان جوجل يكتشف ويفهرس كوبونات الصفحات التالية بدل ما يتجاهلها
  // كتكرار لصفحة 1.
  const path = isSearch || pageNum <= 1 ? "/coupons" : `/coupons?page=${pageNum}`;
  const title =
    !isSearch && pageNum > 1
      ? `جميع الكوبونات — صفحة ${pageNum} — كوبون نور`
      : "جميع الكوبونات — كوبون نور";

  return buildMetadata({
    title,
    description: "تصفح جميع أكواد الخصم والعروض من متاجرك المفضلة.",
    path,
    locale: "ar",
  });
}

export default async function CouponsPage({
  searchParams,
}: { searchParams: Promise<CouponsSearchParams> }) {
  const { q, page } = await searchParams;
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const initialQuery = q?.trim() || "";
  const pageNum = parsePageParam(page);

  let initialCoupons: PublicCouponWithStore[];
  let currentPage = 1;
  let totalPages = 1;

  if (initialQuery) {
    // وضع البحث: كل النتائج المطابقة دفعة وحدة (لحد SEARCH_RESULT_LIMIT)،
    // بدون ترقيم صفحات — سلوك موجود أصلًا، بدون تغيير.
    initialCoupons = await db.coupon.findMany({
      where: couponsWhere(initialQuery),
      orderBy: COUPON_PRIORITY_ORDER,
      include: COUPON_INCLUDE,
      take: SEARCH_RESULT_LIMIT,
    });
  } else {
    // وضع التصفح العادي: ترقيم صفحات حقيقي عبر ?page=N. رقم صفحة أكبر من
    // الإجمالي الفعلي (مثلًا زائر عدّل الرابط يدويًا) بنرجّعه لآخر صفحة
    // صالحة بدل ما نعرض صفحة فاضية أو نعتمد على notFound() — اللي طلع
    // إنها بهالراوت الديناميكي بالكامل (بيقرأ searchParams، مافيش SSG)
    // بترجّع محتوى "غير موجود" بس بحالة HTTP 200 (soft 404) مش 404
    // حقيقية، خلاف صفحات المتجر/الكوبون/التصنيف اللي notFound() فيها
    // شغالة صح لأنها ضمن generateStaticParams. redirect() هون سلوك
    // صحيح وموثوق بكل الحالات، وبيبقي عدد الصفحات القابلة للزحف محدود
    // فعليًا بدل عدد لا نهائي.
    // العدّ الكلي وجلب الكوبونات كانوا يشتغلوا بالتتابع (await لحاله ثم
    // await تاني) — رحلتين منفصلتين لقاعدة البيانات البعيدة (Supabase) بدل
    // وحدة، وهذا بالضبط سبب بطء الصفحة (3.98s بـ Site Audit، أبطأ صفحة
    // بالموقع كامل). تشغيلهم بالتوازي (Promise.all) يقلل الوقت الفعلي
    // تقريبًا للنص، لأن استعلام findMany ما بيعتمد أصلًا على نتيجة العدّ —
    // بس على pageNum الجاي من الرابط مباشرة. لو الصفحة المطلوبة أكبر من
    // totalPages، بنرمي نتيجة findMany ونعمل redirect زي ما كان بالضبط.
    const [total, coupons] = await Promise.all([
      getTotalPages(),
      db.coupon.findMany({
        where: couponsWhere(),
        orderBy: COUPON_PRIORITY_ORDER,
        include: COUPON_INCLUDE,
        skip: (pageNum - 1) * COUPONS_PAGE_SIZE,
        take: COUPONS_PAGE_SIZE,
      }),
    ]);
    totalPages = total;
    if (pageNum > totalPages) {
      redirect(totalPages > 1 ? `/coupons?page=${totalPages}` : "/coupons");
    }
    currentPage = pageNum;
    initialCoupons = coupons;
  }

  // ItemList من نفس روابط الكوبونات المعروضة فعليًا بالصفحة الحالية
  // (initialCoupons نفسه، بترتيبه — يحترم الترقيم/البحث الموجودين، ما
  // فيه استعلام إضافي ولا كوبونات من صفحات تانية).
  const collectionUrl =
    initialQuery || currentPage <= 1 ? `${SITE_URL}/coupons` : `${SITE_URL}/coupons?page=${currentPage}`;
  const collection = collectionPageJsonLd({
    name: "جميع الكوبونات — كوبون نور",
    description: "تصفح جميع أكواد الخصم والعروض من متاجرك المفضلة.",
    url: collectionUrl,
    itemUrls: initialCoupons.map((c) => `${SITE_URL}/store/${c.store.slug}/coupon/${c.slug}`),
  });

  return (
    <>
      {collection && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      )}
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-9">
        <h1 className="text-2xl mb-1.5">{t("nav.coupons")}</h1>
        <p className="text-ink-muted text-sm mb-6">
          {locale === "ar" ? "تصفح جميع أكواد الخصم والعروض" : "Browse all discount codes and deals"}
        </p>
        <CouponsExplorer
          initialCoupons={initialCoupons}
          initialQuery={initialQuery}
          locale={locale}
          page={currentPage}
          totalPages={totalPages}
        />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
