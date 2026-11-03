type Offer = {
  slug: string;
  code: string | null;
  type: "CODE" | "DEAL" | "CASHBACK";
  titleAr: string;
  discountLabel: string;
  descriptionAr: string;
};

type CardCopy = { code: string; title: string; description: string };

/**
 * Short, distinct editorial content for existing multi-coupon stores.
 * Product categories were checked against official merchant sites; discount
 * amounts come from current coupon records, not competitor promotion claims.
 * A code mismatch falls back to the live content instead of showing stale
 * information. No changes to DB SEO titles, slugs, user copy, or image assets.
 */
const EDITORIAL: Readonly<Record<string, CardCopy>> = {
  "ghym|ghym-discount-code": {
    code: "ABBBA1", title: "خصم 10% على مناديل ومناشف غيم",
    description: "وفّر 10% على مشتريات المناديل والمناشف المؤهلة من متجر غيم.",
  },
  "ghym|cm6t-discount-code": {
    code: "CM6T", title: "كوبون غيم لتوفير إضافي على طلبك",
    description: "جرّب هذا الرمز عند طلب مناديل غيم وتحقق من قيمة الخصم في السلة.",
  },
  "faisalaldayel|faisalaldayel-discount-code": {
    code: "ABBBA1", title: "كوبون فيصل الدايل للعطور الفاخرة",
    description: "جرّب الكود على عطور فيصل الدايل ومجموعات النيش المتاحة بالمتجر.",
  },
  "faisalaldayel|cm2648-discount-code": {
    code: "CM2648", title: "رمز بديل للتوفير على عطور فيصل الدايل",
    description: "خيار إضافي عند شراء العطور؛ راجع التخفيض المطبق قبل الدفع.",
  },
  "asnasstore|abbba1-discount-code": {
    code: "ABBBA1", title: "كوبون أسناس لأجهزة المنزل والجمال",
    description: "جرّب الكود على أجهزة المنزل والتجميل والتقنية من أسناس.",
  },
  "asnasstore|asnasstore-discount-code": {
    code: "CM26140", title: "كود خصم أسناس لجميع العملاء",
    description: "رمز آخر للتوفير على الأجهزة والإلكترونيات بحسب شروط العرض.",
  },
  "swytr|swytr-discount-code": {
    code: "4YWO", title: "خصم 15% على غسيل السيارات من سويتر",
    description: "وفّر 15% عند حجز خدمات الغسيل المؤهلة عبر تطبيق سويتر.",
  },
  "swytr|swytr-71v1-discount-code": {
    code: "71v1", title: "كوبون سويتر بقيمة خصم حسب السلة",
    description: "رمز آخر للحجز؛ تعتمد قيمة التوفير على الخدمة وتفاصيل الطلب.",
  },
  "arushi|abbba1-discount-code": {
    code: "ABBBA1", title: "كود أروشي للتوفير على الأزياء",
    description: "جرّب الرمز عند اختيار الفساتين والأزياء من مجموعات أروشي.",
  },
  "arushi|arushi-ex56-coupon": {
    code: "EX56", title: "كوبون أروشي لفساتين البنات والسهرة",
    description: "خيار إضافي على الفساتين والإكسسوارات المؤهلة عند إتمام الطلب.",
  },
  "osma|osma-discount-code": {
    code: "EE61", title: "كود أوسما لخصومات العطور",
    description: "جرّب الرمز على العطور والمنتجات العطرية المؤهلة من أوسما.",
  },
  "osma|abbba1-discount-code": {
    code: "ABBBA1", title: "كوبون إضافي لعطور أوسما",
    description: "فرصة أخرى للتوفير عند التسوق من أوسما؛ تحقق من قيمة الخصم.",
  },
  "eseven-store|abbba1-discount-code": {
    code: "ABBBA1", title: "كوبون إيسيفن للتسوق المتنوع",
    description: "جرّب رمز الخصم على المنتجات المتاحة لدى إيسيفن ستور.",
  },
  "eseven-store|eseven-store-discount-code": {
    code: "CM2684", title: "خصم يصل إلى 10% في إيسيفن",
    description: "عرض مسجل بخصم يصل إلى 10% على المنتجات المؤهلة من المتجر.",
  },
  "almatar|almatar-discount-code": {
    code: "MA25", title: "كود المطار لحجوزات الطيران والفنادق",
    description: "جرّب الرمز على الحجوزات المؤهلة قبل تأكيد الدفع في تطبيق المطار.",
  },
  "almatar|-almatar-discount-code-tow": {
    code: "MR7", title: "عروض الفنادق وكاش باك الطيران من المطار",
    description: "خيار للحجوزات المؤهلة مع عروض كاش باك وفق شروط تطبيق المطار.",
  },
  "rebunesastore|rebunesastore-discount-code": {
    code: "CM26162", title: "خصم 10% على أجهزة الشعر من ريبون",
    description: "وفّر 10% على أجهزة العناية بالشعر والتصفيف المؤهلة.",
  },
  "rebunesastore|abbba1-discount-code": {
    code: "ABBBA1", title: "كوبون ريبون لمستلزمات تصفيف الشعر",
    description: "رمز بديل عند التسوق لأجهزة العناية بالشعر من ريبون.",
  },
  "reef-perfumes|reef-perfumes-discount-code": {
    code: "REX57", title: "عرض ريف للعطور والهدايا",
    description: "جرّب رمز الخصم عند شراء العطور ومنتجات الجمال والهدايا من ريف.",
  },
  "reef-perfumes|abbba1-discount-code": {
    code: "ABBBA1", title: "كوبون ريف للتوفير على العطور",
    description: "خيار إضافي للتسوق من ريف؛ تأكد من قيمة الخصم في السلة.",
  },
  "ntshop|ntshop-discount-code": {
    code: "ABBBA1", title: "كود ناتشورال تاتش لمنتجات الجمال",
    description: "جرّب الرمز على منتجات العناية والجمال والعطور المتاحة.",
  },
};

/** Conservative fallback for future coupons: present live facts without
 * inventing a percentage, audience eligibility or redemption restrictions.
 */
export function getCouponHubCardCopy(storeSlug: string, offer: Offer): { title: string; description: string } {
  const custom = EDITORIAL[storeSlug + "|" + offer.slug];
  if (custom && custom.code.toUpperCase() === (offer.code || "").trim().toUpperCase()) {
    return { title: custom.title, description: custom.description };
  }
  const code = offer.code?.trim();
  const label = offer.discountLabel.trim();
  const percentage = label.match(/(\d+)\s*[%٪]/);
  let title = offer.titleAr.trim();
  if (!title || /^كوبون خصم\s/i.test(title)) {
    title = percentage
      ? "خصم " + percentage[1] + "% من " + storeSlug.replace(/-/g, " ")
      : "عرض إضافي من " + storeSlug.replace(/-/g, " ");
  }
  if (percentage && !/\d+\s*[%٪]/.test(title)) {
    title = "خصم " + percentage[1] + "% — " + title;
  }
  // Strip generic checkout instructions and preserve a short first sentence.
  const full = offer.descriptionAr.trim().replace(/\s+/g, " ");
  const first = full.split(/[.!؟]/).map((x) => x.trim()).find(Boolean) || "";
  const description = first && !/^استخدم الرمز/.test(first)
    ? first.slice(0, 150)
    : code
      ? "جرّب هذا الرمز على الطلبات المؤهلة وراجع التوفير قبل الدفع."
      : "راجع شروط العرض داخل المتجر قبل إتمام الطلب.";
  return { title, description };
}
