import { Check, Percent, Shield, ShoppingBag, ShoppingCart, Star } from "lucide-react";
import styles from "./coupon-hero.module.css";

// Preserve the existing homepage's prop contract; the scene itself is illustrative.
export type HeroOffer = {
  storeName: string;
  discountLabel: string;
  code: string | null;
  isVerified: boolean;
};

/** Real HTML/SVG layers, rendered on the server. No image, canvas or animation JS. */
export function CouponHeroScene() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.scenePlane}>
        <div className={styles.halo} />
        <div className={styles.floorGlow} />
        <svg className={`${styles.orbit} ${styles.orbitBack}`} viewBox="0 0 700 700">
          <path d="M 88,187 C -64,286 143,391 409,447 C 653,498 755,407 619,306" />
        </svg>
        <div className={styles.pedestal}>
          <div className={`${styles.plinth} ${styles.plinthBottom}`} />
          <div className={`${styles.plinth} ${styles.plinthMiddle}`} />
          <div className={`${styles.plinth} ${styles.plinthTop}`} />
        </div>
        <div className={styles.shadow} />
        <div className={styles.backLayer}>
          <div className={styles.backCard}>
            <span className={styles.cardBrand} dir="ltr">COUPON NOOR</span>
            <span className={styles.cardAccent}><Percent strokeWidth={2.5} /></span>
            <span className={styles.cardShield}><Shield fill="currentColor" strokeWidth={1} /><Check /></span>
            <div className={styles.backCopy}>
              <strong>كوبون فعال</strong>
              <span>خصومات مميزة من متاجرك المفضلة</span>
            </div>
          </div>
        </div>
        <div className={styles.ticketLayer}>
          <div className={styles.ticket}>
            <span className={styles.cardBrand} dir="ltr">COUPON NOOR</span>
            <span className={styles.cardAccent}><Percent strokeWidth={2.5} /></span>
            <span className={styles.cartMark}><ShoppingCart strokeWidth={1.7} /></span>
            <div className={styles.ticketCopy}>
              <strong>كود خصم</strong>
              <span>عروض جديدة يومياً</span>
            </div>
            <span className={styles.ticketSerial} />
          </div>
        </div>
        <div className={styles.percentLayer}>
          <div className={styles.percentObject} dir="ltr">
            {Array.from({ length: 12 }, (_, i) => 12 - i).map((depth) => (
              <span key={depth} className={styles.percentEdge} style={{ transform: `translate3d(${depth * .8}px, ${depth * .65}px, ${-depth}px)` }}>%</span>
            ))}
            <span className={styles.percentFace}>%</span>
          </div>
        </div>
        <div className={`${styles.floating} ${styles.bag}`}><div className={styles.iconTile}><ShoppingBag strokeWidth={1.8} /></div></div>
        <div className={`${styles.floating} ${styles.star}`}><div className={styles.iconTile}><Star fill="currentColor" strokeWidth={1.1} /></div></div>
        <div className={`${styles.floating} ${styles.cart}`}><div className={styles.iconTile}><ShoppingCart strokeWidth={1.7} /></div></div>
        <svg className={`${styles.orbit} ${styles.orbitFront}`} viewBox="0 0 700 700">
          <path d="M 60,403 C 22,464 203,537 393,551 C 572,565 695,522 644,459" />
        </svg>
        <span className={styles.lightSpark} />
      </div>
    </div>
  );
}
