import Link from "next/link";
import type { Article } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { COUPON_PRIORITY_ORDER } from "@/lib/coupons-query";
import { ArticleCard } from "@/components/public/ContentCards";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { GuideHero } from "@/components/public/guide/GuideHero";
import { GuideTOC } from "@/components/public/guide/GuideTOC";
import { GuideQuickFacts } from "@/components/public/guide/GuideQuickFacts";
import { GuideSection } from "@/components/public/guide/GuideSection";
import { GuideProductCard } from "@/components/public/guide/GuideProductCard";
import { GuideCouponCTA } from "@/components/public/guide/GuideCouponCTA";
import { GuideRelatedLinks } from "@/components/public/guide/GuideRelatedLinks";
import type { GuideConfig } from "@/lib/guides/types";

type ProseNode = { type: "h3"; text: string } | { type: "p"; text: string };

/** يقسّم article.contentAr (نفس اصطلاح "## عنوان" المستخدم بكل مقالات
 *  الموقع) إلى خريطة عنوان H2 ← عناصره (فقرات + عناوين ### فرعية).
 *  نفس تنسيق المحتوى المستخدم بالراوت العام، فالمقال يضل قابلاً
 *  للتحرير من لوحة التحكم بنفس الطريقة المعتادة. */
function parseGuideContent(contentAr: string): Map<string, ProseNode[]> {
  const blocks = contentAr.split("\n\n").map((b) => b.trim()).filter(Boolean);
  const map = new Map<string, ProseNode[]>();
  let current: string | null = null;

  for (const block of blocks) {
    if (block.startsWith("## ")) {
      current = block.slice(3).trim();
      map.set(current, []);
    } else if (block.startsWith("### ")) {
      if (current) map.get(current)!.push({ type: "h3", text: block.slice(4).trim() });
    } else if (current) {
      map.get(current)!.push({ type: "p", text: block });
    }
  }
  return map;
}

export async function GuideTemplate({
  article, config, locale, relatedArticles,
}: {
  article: Article;
  config: GuideConfig;
  locale: "ar" | "en";
  relatedArticles: Article[];
}) {
  const store = await db.store.findUnique({
    where: { slug: config.storeSlug, isPublished: true },
    include: {
      coupons: {
        where: { isPublished: true },
        orderBy: COUPON_PRIORITY_ORDER,
        take: 1,
      },
    },
  });
  const coupon = store?.coupons[0] ?? null;

  const content = parseGuideContent(article.contentAr);
  const storeHref = `/store/${config.storeSlug}`;
  const couponHref = coupon ? `/store/${config.storeSlug}/coupon/${coupon.slug}` : storeHref;
  const updatedAt = article.updatedAtContent || article.publishedAt || article.updatedAt;

  // جدول المحتويات + id لكل خانة — بنفس ترتيب config.sections بالضبط،
  // عشان ما يصير أي اختلاف بين الفهرس والمحتوى الفعلي.
  const tocItems = config.sections.map((slot, i) => ({
    id: `section-${i}`,
    label:
      slot.type === "prose" ? slot.heading
      : slot.type === "products" ? config.productsHeading
      : slot.type === "coupon" ? config.couponSectionHeading
      : config.faqHeading,
  }));

  return (
    <main>
      <div className="max-w-container mx-auto px-5 pt-6">
        <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted">
          <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
          <span className="text-ink-faint">‹</span>
          <Link href="/blog" className="hover:text-primary transition-colors">المدونة</Link>
          <span className="text-ink-faint">‹</span>
          <span aria-current="page" className="truncate max-w-[220px] text-ink">{article.titleAr}</span>
        </nav>
      </div>

      {store && (
        <GuideHero
          badge={config.heroBadge}
          title={article.titleAr}
          description={config.heroDescription}
          updatedLabel={locale === "ar" ? `آخر تحديث: ${formatDate(updatedAt, locale)}` : `Last updated: ${formatDate(updatedAt, locale)}`}
          ctaLabel={config.heroCtaLabel}
          ctaHref={couponHref}
          store={store}
        />
      )}

      <div className="max-w-container mx-auto px-5 py-10">
        <div className="mb-10">
          <GuideQuickFacts facts={config.quickFacts} />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
          {/* order ثابت (مو responsive) — عشان CSS Grid auto-placement
              يحطهم صح بالحالتين: عمود واحد بالموبايل (المحتويات تظهر
              أول شي قبل باقي الأقسام)، وعمودين بالـ desktop (التوجيه
              يحط هالعمود الأول يمين بواجهة RTL، بالضبط مطابق للقياس). */}
          <div className="order-1">
            <GuideTOC items={tocItems} />
          </div>

          <div className="order-2 flex flex-col gap-12">
            {config.sections.map((slot, i) => {
              const id = tocItems[i].id;

              if (slot.type === "prose") {
                const nodes = content.get(slot.heading) ?? [];
                return (
                  <GuideSection key={id} id={id} title={slot.heading}>
                    {nodes.map((node, j) =>
                      node.type === "h3" ? (
                        <h3 key={j} className="!mt-6 text-base font-bold text-primary">{node.text}</h3>
                      ) : (
                        <p key={j}>{node.text}</p>
                      )
                    )}
                  </GuideSection>
                );
              }

              if (slot.type === "products") {
                return (
                  <GuideSection key={id} id={id} title={config.productsHeading}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {config.products.map((product, j) => (
                        <GuideProductCard key={j} product={product} />
                      ))}
                    </div>
                  </GuideSection>
                );
              }

              if (slot.type === "coupon") {
                if (!coupon) return null;
                return (
                  <GuideSection key={id} id={id} title={config.couponSectionHeading}>
                    <GuideCouponCTA intro={config.couponIntro} coupon={coupon} store={store!} locale={locale} />
                  </GuideSection>
                );
              }

              return (
                <GuideSection key={id} id={id} title={config.faqHeading}>
                  <FaqAccordion items={config.faqItems} />
                </GuideSection>
              );
            })}

            {store && (
              <GuideRelatedLinks
                storeName={store.name.trim()}
                storeHref={storeHref}
                couponHref={couponHref}
                locale={locale}
              />
            )}
          </div>
        </div>

        {relatedArticles.length > 0 && (
          <div className="mt-14 border-t border-border pt-10">
            <h2 className="mb-4 text-lg font-extrabold text-primary">
              {locale === "ar" ? "مقالات ذات صلة" : "Related Articles"}
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {relatedArticles.map((a) => (
                <ArticleCard key={a.id} article={a} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
