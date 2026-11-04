type CouponHubOffer = {
  code: string | null;
  discountLabel: string;
  type: "CODE" | "DEAL" | "CASHBACK";
};

/** Store contexts reflect published coupon descriptions; values and codes
 * are read at request time so we never invent a discount or remove an offer.
 */
const STORE_CONTEXT: Readonly<Record<string, string>> = {
  ghym: "عند شراء المناديل والمناشف والاحتياجات المنزلية من غيم",
  faisalaldayel: "عند اختيار العطور الفرنسية وعطور النيش من فيصل الدايل",
  asnasstore: "عند التسوق للأجهزة المنزلية وأجهزة التجميل والإلكترونيات والعطور من أسناس",
  swytr: "عند حجز خدمات غسيل السيارات عبر تطبيق سويتر",
  arushi: "عند تسوق فساتين البنات والسهرة والأزياء المدرسية من أروشي",
  osma: "عند التسوق للعطور والمنتجات العطرية من أوسما",
  "eseven-store": "عند التسوق من إيسيفن ستور",
  almatar: "عند حجز الطيران أو الفنادق عبر تطبيق المطار",
  rebunesastore: "عند شراء أجهزة العناية بالشعر والتصفيف من ريبون",
  "reef-perfumes": "عند التسوق للعطور ومنتجات الجمال والهدايا من ريف",
  ntshop: "عند شراء منتجات العناية والجمال والعطور من ناتشورال تاتش",
};

export function getCouponCollectionCopy(storeSlug: string, storeName: string, offers: readonly CouponHubOffer[]): string {
  const unique = new Map<string, CouponHubOffer>();
  for (const offer of offers) {
    const key = (offer.code && offer.code.trim().toUpperCase()) || "deal:" + offer.discountLabel.trim();
    if (!unique.has(key)) unique.set(key, offer);
  }
  const labels = [...unique.values()].map((offer) => {
    const code = offer.code && offer.code.trim();
    const label = offer.discountLabel.trim();
    const hasSpecificValue = /\d+\s*[%٪]|\d+\s*ريال|حسب السلة|توصيل مجاني|شحن مجاني/i.test(label);
    if (code) {
      if (/^\d+\s*[%٪]$/.test(label)) return "الرمز " + code + " بخصم " + label;
      if (label === "حسب السلة") return "الرمز " + code + " الذي تتحدد قيمة خصمه حسب السلة";
      return "الرمز " + code + (hasSpecificValue ? " (" + label + ")" : "");
    }
    return "عرض " + label;
  });
  const codes = labels.length === 1 ? labels[0] :
    labels.slice(0, -1).join("، ") + " أو " + labels[labels.length - 1];
  const context = STORE_CONTEXT[storeSlug] || "عند التسوق من " + storeName;
  return context + "، يمكنك استخدام " + codes + ". تعتمد أهلية الخصم على شروط المتجر والمنتجات الموجودة في طلبك؛ لذلك تحقق من تطبيق قيمة التوفير في السلة قبل الدفع.";
}
