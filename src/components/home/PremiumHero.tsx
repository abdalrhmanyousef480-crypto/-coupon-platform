import Link from "next/link";
import { ArrowDown, ArrowUpLeft, ShieldCheck, Percent, Sparkles } from "lucide-react";
import { HeroSearch } from "@/components/public/HeroSearch";
import { DepthSurface } from "./DepthSurface";
import styles from "./home.module.css";

export type SceneCoupon = {
  storeName: string; discountLabel: string; code: string | null; isVerified: boolean;
};

export function PremiumHero({ coupon, verifiedCount }: { coupon?: SceneCoupon; verifiedCount: number }) {
  return (
    <section className={styles.hero} aria-labelledby="home-heading">
      <div className={styles.heroBackdrop} aria-hidden="true" />
      <div className={styles.heroLayout}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span /> كوبون نور <span className={styles.eyebrowSeparator}>/</span> مساحة للتوفير</p>
          <h1 id="home-heading">خصمك القادم<br /><span>أقرب مما تتخيّل.</span></h1>
          <p className={styles.heroDescription}>اكتشف أكواد خصم موثّقة وعروضًا محدثة من متاجرك المفضلة. اختر، انسخ، ووفّر.</p>
          <HeroSearch premium />
          <div className={styles.heroMeta}>
            {verifiedCount > 0 ? <span className={styles.trustPill}><ShieldCheck size={17} aria-hidden="true" /><strong>{verifiedCount}</strong> كوبون موثّق منشور</span> : <span className={styles.trustPill}><ShieldCheck size={17} aria-hidden="true" /> اكتشف العروض المتاحة</span>}
            <Link href="/coupons" className={styles.textLink}>استكشف الكوبونات <ArrowUpLeft size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <DepthSurface className={styles.scene} decorative>
          <div className={styles.orbit} />
          <div className={styles.scenePedestal} />
          <div className={styles.vaultBack}><span>COUPON NOOR</span><Percent size={34} /></div>
          <div className={styles.vaultGlass}><Sparkles size={19} /><span>كل اختيار<br /><strong>فرصة للتوفير.</strong></span></div>
          <div className={styles.vaultTicket}>
            <div className={styles.ticketBrand}><span className={styles.ticketMark}>%</span><span>{coupon?.storeName || "كوبون نور"}</span><ArrowUpLeft size={22} /></div>
            <span className={styles.ticketLabel}>خصمك يبدأ من هنا</span>
            <strong className={styles.ticketOffer}>{coupon?.discountLabel || "اختيارات أذكى"}</strong>
            <div className={styles.ticketPerforation} />
            <div className={styles.ticketBottom}><span>{coupon?.isVerified ? <><ShieldCheck size={16} /> {coupon.code ? "كود موثّق" : "عرض موثّق"}</> : "اكتشف العرض"}</span><bdi className={styles.ticketCode}>{coupon?.code || "COUPON NOOR"}</bdi></div>
          </div>
          <div className={styles.percentObject}>%<span>%</span></div>
          <div className={styles.sceneCaption}><span /> اختيارات صغيرة. فرق كبير.</div>
        </DepthSurface>
      </div>
      <div className={styles.heroFoot}><span>تسوّق بطريقتك. وفّر مع نور.</span><a href="#home-coupons" aria-label="انتقل إلى الكوبونات"><ArrowDown size={18} aria-hidden="true" /></a><span className={styles.heroFootNumber}>01 / اكتشف</span></div>
    </section>
  );
}
