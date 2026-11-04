import Link from "next/link";
import {
  ArrowUpLeft, ShoppingBag, ShieldCheck, RefreshCw, Zap, Tag,
  Shirt, Heart, Smartphone, Plane, House, Utensils, Dumbbell,
} from "lucide-react";
import type { Category, Store, Coupon, Article } from "@prisma/client";
import { CouponCard } from "@/components/public/CouponCard";
import { ArticleCard } from "@/components/public/ContentCards";
import { StoreLogo } from "@/components/ui/StoreLogo";
import { DepthSurface } from "./DepthSurface";
import styles from "./home.module.css";

const categoryIcons = {
  shirt: Shirt, heart: Heart, smartphone: Smartphone, plane: Plane,
  home: House, house: House, utensils: Utensils, dumbbell: Dumbbell,
};
type PublicCoupon = Coupon & { store: Store };

function HomeSectionHead({ number, eyebrow, title, href }: {
  number: string; eyebrow: string; title: string; href: string;
}) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <p className={styles.sectionEyebrow}><span>{number}</span> {eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <Link href={href} className={styles.sectionLink}>
        استكشف الكل <ArrowUpLeft size={19} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function CouponCollection({ coupons, latest = false }: {
  coupons: PublicCoupon[]; latest?: boolean;
}) {
  return (
    <section id={latest ? "home-latest" : "home-coupons"}
      className={`${styles.section} ${latest ? styles.latest : styles.couponSection}`}>
      <div className={styles.container}>
        <HomeSectionHead number={latest ? "05" : "02"}
          eyebrow={latest ? "جديد التوفير" : "اختيارات نور"}
          title={latest ? "عروض وصلت للتو." : "كوبونات تستحق أن تبدأ بها."} href="/coupons" />
        {coupons.length ? (
          <div className={styles.couponGrid}>
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} store={coupon.store}
                locale="ar" className={styles.premiumCoupon} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <Tag aria-hidden="true" />
            <p>اختيارات جديدة في الطريق. استكشف جميع الكوبونات المتاحة.</p>
            <Link href="/coupons" className="btn-secondary">تصفح الكوبونات</Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function StoreShowcase({ stores }: {
  stores: (Store & { _count: { coupons: number } })[];
}) {
  return (
    <section className={`${styles.section} ${styles.storeSection}`}>
      <div className={styles.container}>
        <HomeSectionHead number="03" eyebrow="وجهاتك المفضلة" title="متاجر أقرب إلى ذوقك." href="/stores" />
        <div className={styles.storeGrid}>
          {stores.map((store) => (
            <Link key={store.id} href={`/store/${store.slug}`} prefetch={false} className={styles.storeTile}>
              <StoreLogo name={store.name} logoUrl={store.logoUrl} size={56} className={styles.storeLogo} />
              <span>{store.name}</span>
              <span className={styles.storeCount}>
                {store._count.coupons} كوبون <ArrowUpLeft size={16} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
        {!stores.length && <p className={styles.empty}>تجد جميع المتاجر والعروض في دليل المتاجر.</p>}
      </div>
    </section>
  );
}

export function CategoryShowcase({ categories, counts }: {
  categories: Category[]; counts: Record<string, number>;
}) {
  return (
    <section className={`${styles.section} ${styles.categories}`}>
      <div className={styles.container}>
        <HomeSectionHead number="04" eyebrow="لكل ما تحب" title="عالمك، بخصم أجمل." href="/categories" />
        <div className={styles.categoryGrid}>
          {categories.map((category, index) => {
            const Icon = categoryIcons[category.icon as keyof typeof categoryIcons] || ShoppingBag;
            return (
              <Link key={category.id} href={`/category/${category.slug}`} prefetch={false} className={styles.categoryTile}>
                <span className={styles.categoryTop}>
                  <span className={styles.categoryIcon}><Icon size={22} aria-hidden="true" /></span>
                  <span className={styles.categoryNumber}>{String(index + 1).padStart(2, "0")}</span>
                </span>
                <h3>{category.nameAr}</h3>
                <span className={styles.categoryBottom}>
                  {counts[category.id] ?? 0} كوبون <ArrowUpLeft size={20} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const trustFeatures = [
  { Icon: ShieldCheck, title: "وضوح قبل كل شيء", text: "علامة التحقق تميّز الأكواد التي راجعها فريقنا." },
  { Icon: RefreshCw, title: "اختيارات متجددة", text: "العرض والكود وتفاصيل الاستخدام، في مكان واحد." },
  { Icon: Zap, title: "من البحث إلى النسخ", text: "اعثر على متجرك، انسخ الكود، وأكمل تسوّقك." },
];

export function TrustSection() {
  return (
    <section className={styles.trustSection} aria-labelledby="why-noor">
      <div className={styles.container}>
        <div className={styles.trustHeading}>
          <p className={styles.sectionEyebrow}>توفير، بكل بساطة</p>
          <h2 id="why-noor">موثّق. محدث. سريع.</h2>
          <p>تفاصيل أقل بينك وبين اختيارك القادم.</p>
        </div>
        <div className={styles.trustGrid}>
          {trustFeatures.map(({ Icon, title, text }) => (
            <div className={styles.trustItem} key={title}>
              <span className={styles.trustObject}><Icon size={25} aria-hidden="true" /></span>
              <h3>{title}</h3><p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InteractiveCoupon({ coupon }: { coupon?: PublicCoupon }) {
  return (
    <section className={styles.interactiveSection}>
      <div className={styles.interactiveLayout}>
        <div className={styles.interactiveCopy}>
          <p className={styles.sectionEyebrow}>تفصيل صغير، توفير أكبر</p>
          <h2>الكود بين يديك.<br /><span>والاختيار لك.</span></h2>
          <p>تعرّف على العرض، انسخ الكود، ثم انتقل إلى المتجر. تجربة واضحة من أول خطوة.</p>
          <Link href="/coupon-verification-policy" className={styles.lightLink}>
            كيف نتحقق من الكوبونات؟ <ArrowUpLeft size={18} aria-hidden="true" />
          </Link>
        </div>
        <DepthSurface className={styles.interactiveStage}>
          <div className={styles.membershipBack} aria-hidden="true">
            <ShieldCheck size={25} /><span>COUPON NOOR / YOUR NEXT FIND</span>
          </div>
          {coupon ? (
            <CouponCard coupon={coupon} store={coupon.store} locale="ar" className={styles.interactiveCard} />
          ) : (
            <div className={styles.membershipEmpty}>
              <span>%</span><p>فرص جديدة للتوفير</p>
              <Link href="/coupons" className="btn-primary">استكشف الكوبونات</Link>
            </div>
          )}
        </DepthSurface>
      </div>
    </section>
  );
}

export function HomeJournal({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  return (
    <section className={`${styles.section} ${styles.journal}`}>
      <div className={styles.container}>
        <HomeSectionHead number="06" eyebrow="اقرأ قبل أن تتسوّق" title="اختيارات أذكى تبدأ هنا." href="/blog" />
        <div className={styles.journalGrid}>
          {articles.map((article) => <ArticleCard key={article.id} article={article} locale="ar" />)}
        </div>
      </div>
    </section>
  );
}
