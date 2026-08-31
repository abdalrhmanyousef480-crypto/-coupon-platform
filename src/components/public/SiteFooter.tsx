import Link from "next/link";
import { Facebook, Instagram, Twitter, Music2, Ghost } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n";
import { ScrollToTopButton } from "@/components/public/ScrollToTopButton";
import { getSiteSettings } from "@/lib/site-settings";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = getTranslator(locale);
  const prefix = locale === "en" ? "/en" : "";
  const year = new Date().getFullYear();
  const settings = await getSiteSettings();

  const explore = [
    { href: `${prefix}/coupons`, label: t("nav.coupons") },
    { href: `${prefix}/stores`, label: t("nav.stores") },
    { href: `${prefix}/categories`, label: t("nav.categories") },
    { href: `${prefix}/blog`, label: t("nav.blog") },
  ];
  const company = [
    { href: `${prefix}/about`, label: t("nav.about") },
    { href: `${prefix}/contact`, label: t("nav.contact") },
  ];
  const legal = [
    { href: `${prefix}/privacy`, label: locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy" },
    { href: `${prefix}/terms`, label: locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions" },
    { href: `${prefix}/affiliate-disclosure`, label: locale === "ar" ? "إفصاح الشراكة" : "Affiliate Disclosure" },
    { href: `${prefix}/editorial-policy`, label: locale === "ar" ? "سياسة التحرير" : "Editorial Policy" },
  ];

  // ما تظهر إلا الأيقونات اللي فعليًا لها رابط محفوظ من لوحة التحكم
  // (/admin/settings) — أفضل من عرض أيقونة لحساب غير موجود أصلًا.
  const social = [
    { href: settings?.facebookUrl, Icon: Facebook, label: "Facebook" },
    { href: settings?.instagramUrl, Icon: Instagram, label: "Instagram" },
    { href: settings?.twitterUrl, Icon: Twitter, label: "X (Twitter)" },
    { href: settings?.tiktokUrl, Icon: Music2, label: "TikTok" },
    { href: settings?.snapchatUrl, Icon: Ghost, label: "Snapchat" },
  ].filter((item): item is { href: string; Icon: typeof Facebook; label: string } => !!item.href);

  return (
    <>
      <ScrollToTopButton />
      <footer className="mt-10 bg-primary pt-12 pb-8 text-white/80 md:pt-16 md:pb-10">
        <div className="max-w-container mx-auto px-5 md:px-8">
          {/* البراند صف كامل مستقل بكل المقاسات، والأعمدة الثلاثة الروابط
              جنب بعض من الموبايل (grid-cols-3) عشان الفوتر ما يطول عموديًا —
              الخط بيصغر شوي على الموبايل (sm:text-sm) عشان ما يلف. */}
          <div className="mb-10 md:mb-12">
            <div className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-base">%</span>
              {t("site.name")}
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-white/70">
              {locale === "ar"
                ? "منصتك الموثوقة للعثور على أفضل أكواد الخصم والعروض من متاجرك المفضلة."
                : "Your trusted platform for finding the best discount codes and deals."}
            </p>
            {social.length > 0 && (
              <div className="mt-5 flex gap-3">
                {social.map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-0 sm:gap-x-6 md:gap-x-8">
            <FooterCol title={locale === "ar" ? "استكشف" : "Explore"} items={explore} />
            <FooterCol title={locale === "ar" ? "الشركة" : "Company"} items={company} />
            <FooterCol title={locale === "ar" ? "قانوني" : "Legal"} items={legal} />
          </div>

          <div className="mt-12 border-t border-white/15 pt-6 md:mt-14">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[13px] text-white/60">© {year} {t("site.name")}. {t("footer.rights")}</span>
            </div>
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/50">
              {locale === "ar"
                ? "قد نحصل على عمولة عند استخدامك لبعض الروابط في هذا الموقع، دون أي تكلفة إضافية عليك."
                : "We may earn a commission when you use some links on this site, at no extra cost to you."}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterCol({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white sm:mb-4 sm:text-xs sm:tracking-wider">{title}</div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="-mx-1.5 block rounded-md px-1.5 py-1.5 text-[11.5px] leading-snug text-white/70 transition-colors hover:bg-white/5 hover:text-white sm:-mx-2 sm:px-2 sm:py-2 sm:text-sm"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
