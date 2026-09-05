// ============================================================
// SEED SCRIPT — بيانات تجريبية واقعية لأول تشغيل.
// شغّله بـ: npm run db:seed
// ============================================================
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 بدء زراعة البيانات...");

  // ---------- Admin user ----------
  const passwordHash = await bcrypt.hash("Admin@123456", 10);
  const admin = await db.user.upsert({
    where: { email: "admin@couponeta.com" },
    update: {},
    create: {
      name: "فريق التحرير",
      email: "admin@couponeta.com",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log("✓ تم إنشاء حساب الأدمن: admin@couponeta.com / Admin@123456");

  // ---------- Categories ----------
  const categoriesData = [
    { name: "Fashion", nameAr: "أزياء", slug: "fashion", icon: "shirt", emoji: "👗",
      description: "Latest discount codes on clothing, shoes and accessories.",
      descriptionAr: "أحدث أكواد الخصم على الملابس والأحذية والإكسسوارات." },
    { name: "Electronics", nameAr: "إلكترونيات", slug: "electronics", icon: "cpu", emoji: "💻",
      description: "Save on phones, laptops and smart home devices.",
      descriptionAr: "وفر على الهواتف والحواسيب والأجهزة المنزلية الذكية." },
    { name: "Travel", nameAr: "سفر", slug: "travel", icon: "plane", emoji: "✈️",
      description: "Discount codes for flights, hotels and car rentals.",
      descriptionAr: "أكواد خصم على حجوزات الطيران والفنادق وتأجير السيارات." },
    { name: "Beauty", nameAr: "تجميل", slug: "beauty", icon: "sparkles", emoji: "💄",
      description: "Deals on skincare, makeup and fragrances.",
      descriptionAr: "عروض على منتجات العناية بالبشرة والمكياج والعطور." },
    { name: "Health", nameAr: "صحة", slug: "health", icon: "heart", emoji: "💊",
      description: "Discounts on supplements and health products.",
      descriptionAr: "خصومات على المكملات الغذائية والمنتجات الصحية." },
    { name: "Gaming", nameAr: "ألعاب", slug: "gaming", icon: "gamepad-2", emoji: "🎮",
      description: "Deals on video games, consoles and in-game credit.",
      descriptionAr: "عروض على الألعاب الإلكترونية والأجهزة وبطاقات الشحن." },
    { name: "Restaurants", nameAr: "مطاعم", slug: "restaurants", icon: "utensils-crossed", emoji: "🍔",
      description: "Discounts on restaurants and food delivery orders.",
      descriptionAr: "خصومات على طلبات المطاعم وتوصيل الطعام." },
    { name: "Books", nameAr: "كتب", slug: "books", icon: "book-open", emoji: "📚",
      description: "Save on books, e-books and educational reading.",
      descriptionAr: "وفر على الكتب الورقية والإلكترونية والمواد التعليمية." },
    { name: "Furniture", nameAr: "أثاث", slug: "furniture", icon: "sofa", emoji: "🛋️",
      description: "Deals on furniture and home decor.",
      descriptionAr: "عروض على الأثاث وديكورات المنزل." },
    { name: "Gifts", nameAr: "هدايا", slug: "gifts", icon: "gift", emoji: "🎁",
      description: "Discount codes for gifts, flowers and special occasions.",
      descriptionAr: "أكواد خصم على الهدايا والورود والمناسبات الخاصة." },
  ];
  const categories: Record<string, Awaited<ReturnType<typeof db.category.upsert>>> = {};
  for (const c of categoriesData) {
    categories[c.slug] = await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`✓ تم إنشاء ${categoriesData.length} تصنيفات`);

  // ---------- Stores ----------
  const storesData = [
    { name: "iHerb", slug: "iherb", categorySlug: "health", isFeatured: true,
      logoUrl: "https://logo.clearbit.com/iherb.com", website: "https://www.iherb.com",
      description: "iHerb is a leading US retailer of supplements and natural products with fast worldwide shipping.",
      descriptionAr: "متجر iHerb الأمريكي الرائد لبيع المكملات الغذائية والمنتجات الطبيعية والعضوية بشحن سريع لجميع أنحاء العالم." },
    { name: "Namshi", slug: "namshi", categorySlug: "fashion", isFeatured: true,
      logoUrl: "https://logo.clearbit.com/namshi.com", website: "https://www.namshi.com",
      description: "Namshi is the leading fashion destination in the Middle East.",
      descriptionAr: "نمشي هي وجهتك الأولى للأزياء والأحذية والإكسسوارات في الشرق الأوسط." },
    { name: "Noon", slug: "noon", categorySlug: "electronics", isFeatured: true,
      logoUrl: "https://logo.clearbit.com/noon.com", website: "https://www.noon.com",
      description: "Noon is the region's largest online marketplace for electronics and more.",
      descriptionAr: "نون هي المنصة الرقمية الأكبر في المنطقة لبيع الإلكترونيات والأجهزة المنزلية." },
    { name: "Booking.com", slug: "booking", categorySlug: "travel", isFeatured: true,
      logoUrl: "https://logo.clearbit.com/booking.com", website: "https://www.booking.com",
      description: "Booking.com is a global platform for booking hotels and resorts.",
      descriptionAr: "بوكينج دوت كوم منصة عالمية لحجز الفنادق والشقق والمنتجعات." },
    { name: "Sephora", slug: "sephora", categorySlug: "beauty", isFeatured: true,
      logoUrl: "https://logo.clearbit.com/sephora.com", website: "https://www.sephora.com",
      description: "Sephora is the world's leading destination for beauty and skincare.",
      descriptionAr: "سيفورا هي الوجهة العالمية الأولى لمنتجات التجميل والعناية بالبشرة." },
  ];
  const stores: Record<string, Awaited<ReturnType<typeof db.store.upsert>>> = {};
  for (const s of storesData) {
    const { categorySlug, ...data } = s;
    stores[s.slug] = await db.store.upsert({
      where: { slug: s.slug }, update: {},
      create: { ...data, categoryId: categories[categorySlug].id },
    });
  }
  console.log(`✓ تم إنشاء ${storesData.length} متاجر`);

  // ---------- Coupons ----------
  const couponsData = [
    { storeSlug: "iherb", slug: "20-off-first-order", type: "CODE" as const, code: "DGK0899", discountLabel: "20%",
      title: "20% off your first order", titleAr: "خصم 20% على أول طلب",
      description: "Get 20% off your first order at iHerb.", descriptionAr: "احصل على خصم 20% على طلبك الأول من موقع iHerb.",
      termsAr: "صالح للعملاء الجدد فقط. الحد الأقصى للخصم 20 دولارًا.",
      isVerified: true, isFeatured: true, daysUntilExpiry: 14 },
    { storeSlug: "namshi", slug: "30-off-fashion", type: "CODE" as const, code: "NAM30", discountLabel: "30%",
      title: "30% off selected fashion", titleAr: "خصم 30% على الأزياء المختارة",
      description: "Save 30% on a wide selection of clothing at Namshi.", descriptionAr: "وفر 30% على تشكيلة واسعة من الملابس والأحذية لدى نمشي.",
      termsAr: "يستثني بعض الماركات الفاخرة.",
      isVerified: true, isFeatured: true, daysUntilExpiry: 5 },
    { storeSlug: "noon", slug: "electronics-15-off", type: "CODE" as const, code: "NOONTECH15", discountLabel: "15%",
      title: "15% off electronics", titleAr: "خصم 15% على الإلكترونيات",
      description: "Instant 15% off on select electronics at Noon.", descriptionAr: "خصم فوري 15% عند شراء أجهزة إلكترونية مختارة من نون.",
      termsAr: "الحد الأقصى للخصم 100 ريال.",
      isVerified: true, isFeatured: true, daysUntilExpiry: 7 },
    { storeSlug: "booking", slug: "10-off-hotels", type: "CODE" as const, code: "STAY10", discountLabel: "10%",
      title: "10% off hotel bookings", titleAr: "خصم 10% على حجوزات الفنادق",
      description: "Save an extra 10% when booking your next hotel.", descriptionAr: "وفر 10% إضافية عند حجز فندقك القادم عبر Booking.com.",
      termsAr: "يسري على فنادق مشاركة فقط.",
      isVerified: true, isFeatured: true, daysUntilExpiry: 20 },
    { storeSlug: "sephora", slug: "free-gift-50", type: "CODE" as const, code: "GLOW25", discountLabel: "هدية مجانية",
      title: "Free gift with $50 purchase", titleAr: "هدية مجانية عند الشراء بقيمة 50 دولارًا",
      description: "Get a free luxury sample set when you spend $50 or more.", descriptionAr: "احصل على مجموعة عينات فاخرة مجانًا عند إنفاق 50 دولارًا أو أكثر.",
      termsAr: "حتى نفاد الكمية.",
      isVerified: true, isFeatured: true, daysUntilExpiry: 12 },
    { storeSlug: "iherb", slug: "free-shipping-60", type: "DEAL" as const, code: null, discountLabel: "شحن مجاني",
      title: "Free shipping on orders over $60", titleAr: "شحن مجاني للطلبات فوق 60 دولارًا",
      description: "No code needed — free shipping applies automatically.", descriptionAr: "لا حاجة لكود، يتم تفعيل الشحن المجاني تلقائيًا عند تجاوز 60 دولارًا.",
      termsAr: "يسري على دول مختارة فقط.",
      isVerified: true, isFeatured: false, daysUntilExpiry: 30 },
  ];
  for (const c of couponsData) {
    const { storeSlug, daysUntilExpiry, ...data } = c;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysUntilExpiry);
    const storeId = stores[storeSlug].id;
    const existing = await db.coupon.findUnique({ where: { storeId_slug: { storeId, slug: data.slug } } });
    if (!existing) {
      await db.coupon.create({
        data: { ...data, storeId, storeUrl: stores[storeSlug].website, expiresAt, lastCheckedAt: new Date() },
      });
    }
  }
  console.log(`✓ تم إنشاء ${couponsData.length} كوبونات`);

  // ---------- Articles ----------
  const articlesData = [
    {
      slug: "how-to-save-money-online-shopping", categorySlug: "fashion",
      title: "10 Smart Ways to Save Money Shopping Online", titleAr: "10 طرق ذكية لتوفير المال عند التسوق أونلاين",
      excerpt: "Discover practical strategies to cut your online shopping bill.", excerptAr: "تعرف على أفضل الاستراتيجيات العملية لتقليل فاتورة تسوقك الإلكتروني.",
      featuredImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80",
      contentAr: "## ابدأ دائمًا بالبحث عن كود خصم\n\nقبل إتمام أي عملية شراء، خذ دقيقة للبحث عن كود خصم صالح للمتجر الذي تتسوق منه.\n\n## قارن الأسعار بين المتاجر\n\nلا تفترض أن أول متجر تراه يقدم أفضل سعر. خصص بضع دقائق للمقارنة.",
      content: "## Always search for a coupon code first\n\nBefore completing any purchase, take a minute to search for a valid coupon code.\n\n## Compare prices across stores\n\nDon't assume the first store you see has the best price.",
      status: "PUBLISHED" as const,
    },
  ];
  for (const a of articlesData) {
    const { categorySlug, ...data } = a;
    const existing = await db.article.findUnique({ where: { slug: a.slug } });
    if (!existing) {
      await db.article.create({
        data: { ...data, categoryId: categories[categorySlug].id, authorId: admin.id, publishedAt: new Date() },
      });
    }
  }
  console.log(`✓ تم إنشاء ${articlesData.length} مقالات`);

  // ---------- Site settings ----------
  await db.siteSettings.upsert({
    where: { id: "singleton" }, update: {},
    create: { id: "singleton", siteName: "Couponeta", siteNameAr: "كوبون نور" },
  });

  console.log("✅ اكتملت زراعة البيانات بنجاح");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
