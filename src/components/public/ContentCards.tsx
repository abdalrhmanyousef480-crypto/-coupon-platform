import Link from "next/link";
import Image from "next/image";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, formatDate, readingTime } from "@/lib/utils";
import { StoreLogo } from "@/components/ui/StoreLogo";

type Locale = "ar" | "en";

/* ---------------- StoreCard ---------------- */
export function StoreCard({
  store, couponCount, t, className, priority,
}: {
  store: { slug: string; name: string; logoUrl: string };
  couponCount: number;
  t: (key: string) => string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link href={`/store/${store.slug}`} className={cn("card card-hover group flex flex-col items-center gap-3 p-5 text-center", className)}>
      <StoreLogo
        name={store.name}
        logoUrl={store.logoUrl}
        size={44}
        priority={priority}
        className="w-16 h-16 rounded-md ring-1 ring-border transition-transform duration-300 group-hover:scale-105"
      />
      <div className="font-bold text-sm text-primary">{store.name}</div>
      <div className="text-xs text-ink-muted">{couponCount} {t("store.couponsCount")}</div>
    </Link>
  );
}

/* ---------------- CategoryCard ---------------- */
export function CategoryCard({
  category, couponCount, locale,
}: {
  category: { slug: string; name: string; nameAr: string; icon: string };
  couponCount: number;
  locale: Locale;
}) {
  const IconComp = (Icons[toPascalCase(category.icon) as keyof typeof Icons] || Icons.Tag) as LucideIcon;
  const name = locale === "ar" ? category.nameAr : category.name;
  return (
    <Link href={`/category/${category.slug}`} className="card card-hover group flex flex-col items-start gap-3 p-5">
      <div className="w-11 h-11 rounded-md bg-accent-soft text-accent flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <IconComp className="h-5 w-5" />
      </div>
      <div className="font-bold text-sm text-primary">{name}</div>
      <div className="text-xs text-ink-muted">{couponCount} {locale === "ar" ? "كوبون" : "coupons"}</div>
    </Link>
  );
}

function toPascalCase(str: string) {
  return str.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

/* ---------------- ArticleCard ---------------- */
export function ArticleCard({
  article, categoryName, locale,
}: {
  article: {
    slug: string; title: string; titleAr: string;
    excerpt: string; excerptAr: string; featuredImage: string;
    publishedAt: Date | null; content: string; contentAr: string;
  };
  categoryName?: string;
  locale: Locale;
}) {
  const title = locale === "ar" ? article.titleAr : article.title;
  const excerpt = locale === "ar" ? article.excerptAr : article.excerpt;
  const content = locale === "ar" ? article.contentAr : article.content;

  return (
    <Link href={`/blog/${article.slug}`} className="card card-hover group overflow-hidden flex flex-col">
      <div className="relative w-full aspect-[16/10] bg-surface-alt overflow-hidden">
        <Image src={article.featuredImage} alt={title} fill className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
      </div>
      <div className="p-[18px] flex flex-col gap-2.5 flex-1">
        {categoryName && <span className="badge-accent self-start">{categoryName}</span>}
        <h3 className="font-bold text-base text-primary leading-snug transition-colors group-hover:text-accent">{title}</h3>
        <p className="text-[13.5px] text-ink-muted leading-relaxed line-clamp-2">{excerpt}</p>
        <div className="flex items-center gap-2 text-xs text-ink-faint mt-auto pt-2">
          {article.publishedAt && <span>{formatDate(article.publishedAt, locale)}</span>}
          <span>·</span>
          <span>{readingTime(content, locale)}</span>
        </div>
      </div>
    </Link>
  );
}
