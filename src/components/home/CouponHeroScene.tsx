import { Percent, ShieldCheck } from "lucide-react";
import { getTranslator } from "@/lib/i18n";
import styles from "./coupon-hero.module.css";

export type HeroOffer = {
  storeName: string;
  discountLabel: string;
  code: string | null;
  isVerified: boolean;
};

/** Decorative server-rendered scene. CSS supplies idle motion without hover or hydration. */
export function CouponHeroScene({ offer }: { offer?: HeroOffer }) {
  const t = getTranslator("ar");
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.scenePlane}>
        <div className={styles.shadow} />
        <div className={styles.backLayer}>
          <div className={styles.backCard}>
            <span className={styles.backBrand}>{t("site.name")}</span>
            <Percent size={32} strokeWidth={1.3} />
            <span className={styles.backDetail} />
          </div>
        </div>
        <div className={styles.ticketLayer}>
          <div className={styles.ticket}>
            <div className={styles.ticketHeader}>
              <span className={styles.brandMark}>%</span>
              <span className={styles.storeName}>{offer?.storeName || t("site.name")}</span>
              <span className={styles.ticketStamp}>COUPON NOOR</span>
            </div>
            <div className={styles.offer}>
              <strong>{offer?.discountLabel || t("site.name")}</strong>
              <span className={styles.offerRule} />
            </div>
            <div className={styles.perforation} />
            <div className={styles.ticketFooter}>
              <bdi className={styles.code}>{offer?.code || "COUPON NOOR"}</bdi>
              {offer?.isVerified && <span className={styles.verified}><ShieldCheck size={14} />{t("coupon.verified")}</span>}
            </div>
          </div>
        </div>
        <div className={styles.percentLayer}><div className={styles.percentBadge}>%</div></div>
      </div>
    </div>
  );
}
