import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";

// صورة OG مولّدة لكل كوبون على حدة — تعرض قيمة الخصم الفعلية واسم المتجر
// بدل شعار مصغّر ومشوّه فقط. تحل تلقائيًا محل ogImage اليدوي بما إن
// couponMetadata() ما عاد يمرر ogImage (راجع lib/seo.ts).
export const alt = "كوبون خصم";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ storeSlug: string; couponSlug: string }>;
}) {
  const { storeSlug, couponSlug } = await params;
  const [coupon, tajawalBold] = await Promise.all([
    db.coupon.findFirst({
      where: { slug: couponSlug, store: { slug: storeSlug } },
      include: { store: true },
    }),
    getTajawalBold(),
  ]);

  const discount = coupon?.discountLabel ?? "%";
  const storeName = coupon?.store.name ?? "كوبون نور";
  const verified = coupon?.isVerified ?? false;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14213D 0%, #1E2E52 100%)",
          position: "relative",
        }}
      >
        {verified && (
          <div
            style={{
              position: "absolute",
              top: 48,
              display: "flex",
              alignItems: "center",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
            }}
          >
            ✓ VERIFIED
          </div>
        )}

        <div style={{ display: "flex", fontSize: 140, fontWeight: 800, color: "#CD3018", lineHeight: 1 }}>
          {discount}
        </div>

        <div style={{ display: "flex", fontFamily: "Tajawal", marginTop: 20, fontSize: 42, fontWeight: 700, color: "#ffffff" }}>
          {storeName}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 44 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#CD3018",
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            %
          </div>
          <div style={{ display: "flex", fontFamily: "Tajawal", color: "rgba(255,255,255,0.85)", fontSize: 24, fontWeight: 700 }}>
            كوبون نور
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: tajawalBold.map((data) => ({ name: "Tajawal", data, weight: 700 as const, style: "normal" as const })) }
  );
}
