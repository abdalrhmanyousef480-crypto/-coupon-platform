import { ShieldCheck } from "lucide-react";
import { getTranslator } from "@/lib/i18n";
import { HeroSearch } from "@/components/public/HeroSearch";
import { CouponHeroScene, type HeroOffer } from "./CouponHeroScene";
import styles from "./coupon-hero.module.css";

export function CouponHero({ verifiedCount, offer }: { verifiedCount: number; offer?: HeroOffer }) {
  const t = getTranslator("ar");
  return (
    <section className={styles.hero} aria-labelledby="coupon-hero-heading">
      <div className={styles.layout}>
        <div className={styles.content}>
          <span className={styles.eyebrow}><span aria-hidden="true">%</span>{t("site.name")}</span>
          <h1 id="coupon-hero-heading" className={styles.title}>{t("hero.title")}</h1>
          <p className={styles.description}>{t("hero.subtitle")}</p>
          <div className={styles.search}><HeroSearch /></div>
          {verifiedCount > 0 && (
            <div className={styles.trust}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span><strong>{verifiedCount}</strong> {t("trust.verifiedCoupons")}</span>
            </div>
          )}
        </div>
        <CouponHeroScene offer={offer} />
      </div>
    </section>
  );
}
