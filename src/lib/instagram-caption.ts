/**
 * Instagram caption draft generator for Coupon Noor.
 * Pure helper: does not call Meta, publish posts, or mutate SEO data.
 * Captions are suggestions and must not invent a discount or verification claim.
 */
export type InstagramCouponDraft = {
  storeName: string;
  storeSlug: string;
  couponSlug: string;
  code: string | null;
  discountLabel: string;
  titleAr: string;
  termsAr?: string | null;
  isVerified: boolean;
};

const SITE = "https://www.couponsnoor.com";

function clean(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function hashtag(value: string): string {
  return clean(value).replace(/[^\p{L}\p{N}_ ]/gu, "").replace(/\s+/g, "_");
}

export function makeInstagramCouponCaption(coupon: InstagramCouponDraft) {
  const name = clean(coupon.storeName);
  const code = coupon.code?.trim() || null;
  const discount = clean(coupon.discountLabel);
  const title = clean(coupon.titleAr);
  const url = `${SITE}/store/${encodeURIComponent(coupon.storeSlug)}/coupon/${encodeURIComponent(coupon.couponSlug)}`;
  const headline = code
    ? `كود خصم ${name} ${code} | ${discount}`
    : `${name} | ${title}`;
  const description = code
    ? `كود الخصم: ${code}\nالعرض: ${discount}`
    : `تفاصيل العرض: ${title}`;
  const verified = coupon.isVerified ? "\nتم التحقق من الكوبون لدى كوبون نور." : "";
  const terms = coupon.termsAr?.trim() ? `\nالشروط: ${clean(coupon.termsAr).slice(0, 250)}` : "";
  const tags = [
    `#كود_خصم_${hashtag(name)}`,
    `#كوبون_${hashtag(name)}`,
    "#كوبون_نور",
    "#اكواد_خصم",
    "#كوبونات",
    "#خصومات_السعودية",
  ].filter((v, i, arr) => v.length > 1 && arr.indexOf(v) === i);
  const caption = [
    headline,
    description + verified + terms,
    "تفاصيل الكوبون وشروطه عبر كوبون نور — الرابط في البايو.",
    url,
    tags.join(" "),
  ].join("\n\n");
  return { headline, caption: caption.slice(0, 2200), hashtags: tags, couponUrl: url };
}
