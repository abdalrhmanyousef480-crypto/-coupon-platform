import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { logoToPngDataUri, tajawalOgFonts } from "@/lib/coupon-og";
import type { OgFont } from "@/lib/coupon-og";

/**
 * Satori's RTL flex text has an invisible advance around Arabic word spans:
 * a "gap: 4px" still renders as widely separated words. Render each word
 * once, crop the TRANSPARENT horizontal margins using its actual pixels,
 * then compose the words right-to-left with an exact pixel gap.
 *
 * Keeping the original vertical raster height for every word preserves the
 * baseline. This helper only affects the Instagram-specific image route.
 */
async function tightArabicLine(
  text: string,
  fontSize: number,
  color: string,
  fonts: OgFont[],
  space = 9,
  maximumWidth = 940
): Promise<{ src: string; width: number; height: number }> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lineHeight = Math.ceil(fontSize * 1.55);
  const rasters = await Promise.all(words.map(async (word) => {
    // A generous blank canvas prevents clipping; crop only the horizontal
    // margins AFTER Satori has rendered the actual Tajawal glyphs.
    const canvasWidth = Math.max(160, Math.ceil(word.length * fontSize * 1.35 + 110));
    const response = new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%",
        alignItems: "center", justifyContent: "center", fontFamily: "Tajawal",
        fontSize, fontWeight: 700, color, backgroundColor: "transparent" }}>
        <span>{word}</span>
      </div>,
      { width: canvasWidth, height: lineHeight, fonts }
    );
    const png = Buffer.from(await response.arrayBuffer());
    const { data, info } = await sharp(png).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    let left = info.width;
    let right = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels + 3] > 20) {
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }
    if (right < left) throw new Error("Arabic word failed to render");
    left = Math.max(0, left - 2);
    right = Math.min(info.width - 1, right + 2);
    const width = right - left + 1;
    return {
      width,
      png: await sharp(png).extract({
        left, top: 0, width, height: lineHeight,
      }).png().toBuffer(),
    };
  }));

  const totalWidth = rasters.reduce((sum, image) => sum + image.width, 0)
    + Math.max(0, rasters.length - 1) * space;
  const composites: { input: Buffer; left: number; top: number }[] = [];
  let rightEdge = totalWidth;
  for (const part of rasters) {
    rightEdge -= part.width;
    composites.push({ input: part.png, left: rightEdge, top: 0 });
    rightEdge -= space;
  }
  let buffer = await sharp({
    create: {
      width: totalWidth, height: lineHeight, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites).png().toBuffer();
  if (totalWidth > maximumWidth) {
    buffer = await sharp(buffer).resize({ width: maximumWidth }).png().toBuffer();
  }
  const meta = await sharp(buffer).metadata();
  return { src: `data:image/png;base64,${buffer.toString("base64")}`,
    width: meta.width!, height: meta.height! };
}

/**
 * Separate, dynamic social artwork: real store logo, current coupon data.
 * Does NOT alter store images, coupon card images, or Google OG metadata.
 * ?format=webp can be used for a crawlable web image, default JPEG for Meta.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: {
      slug: couponSlug,
      isPublished: true,
      store: { slug: storeSlug, isPublished: true },
    },
    include: { store: true },
  });
  if (!coupon || (coupon.expiresAt && coupon.expiresAt <= new Date())) {
    return new Response("Coupon unavailable", { status: 404 });
  }

  try {
    const [fontBuffers, logo] = await Promise.all([
      getTajawalBold(),
      logoToPngDataUri(coupon.store.logoUrl),
    ]);
    const fonts = tajawalOgFonts(fontBuffers);
    const name = coupon.store.name.trim();
    const code = coupon.code?.trim() || "";
    const isCode = code.length > 0;
    // Use the Arabic merchant name on the artwork; the actual store logo
    // already carries any English translation. This avoids wide mixed-RTL
    // headings such as "Sporter | سبورتر كود خصم".
    const localizedName = name.match(/[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)*/g)
      ?.sort((a, b) => b.length - a.length)[0]?.trim()
      || name.split("|")[0].trim();
    const heading = isCode ? `كود خصم ${localizedName}` : `عرض ${localizedName}`;
    const headingFontSize = heading.length > 25 ? 42 : heading.length > 18 ? 50 : 61;
    const [brandLine, headingLine, codeLabel, fallbackName, withoutCode] = await Promise.all([
      tightArabicLine("كوبون نور", 39, "#0b2344", fonts, 7, 320),
      tightArabicLine(heading, headingFontSize, "#102748", fonts, 9, 940),
      tightArabicLine(isCode ? "رمز كود الخصم" : "تفاصيل العرض", 29, "#52647e", fonts, 5, 390),
      logo ? Promise.resolve(null) : tightArabicLine(localizedName, name.length > 15 ? 36 : 48, "#14213d", fonts, 7, 285),
      isCode ? Promise.resolve(null) : tightArabicLine("بدون كود", 82, "#0b2344", fonts, 8, 670),
    ]);

    const image = new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start", background: "#fbfdff",
          fontFamily: "Tajawal", color: "#0b2344", overflow: "hidden", position: "relative",
        }}>
          <div style={{ display: "flex", position: "absolute", top: -200, left: -300,
            width: 810, height: 540, background: "#e2f1ff", borderRadius: 300,
            transform: "rotate(-24deg)" }} />
          <div style={{ display: "flex", position: "absolute", bottom: -230, right: -200,
            width: 670, height: 450, background: "#d8edff", borderRadius: 300,
            transform: "rotate(-28deg)" }} />
          <div style={{ display: "flex", position: "absolute", top: 0, left: 0,
            width: 200, height: 18, background: "#1479ee", borderBottomRightRadius: 28 }} />

          {/* The exact brand wordmark from the website header (% + site name). */}
          <div style={{ display: "flex", position: "absolute", top: 55, right: 52,
            alignItems: "center", gap: 14, flexDirection: "row-reverse" }}>
            <div style={{ display: "flex", width: 58, height: 58, borderRadius: 14,
              background: "#1479ee", color: "#fff", fontSize: 37, fontWeight: 700,
              justifyContent: "center", alignItems: "center" }}>%</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <img src={brandLine.src} width={brandLine.width} height={brandLine.height}
                style={{ objectFit: "contain" }} />
              <div style={{ display: "flex", fontSize: 21, color: "#677790", marginTop: 4 }}>couponsnoor.com</div>
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 176, width: 336, height: 310,
            background: "#ffffff", borderRadius: 48, border: "3px solid #e9f1fa",
            justifyContent: "center", alignItems: "center", overflow: "hidden",
            boxShadow: "0 18px 35px rgba(20,61,110,0.09)" }}>
            {logo ? (
              <img src={logo} width={244} height={244} style={{ objectFit: "contain" }} />
            ) : (
              fallbackName && <img src={fallbackName.src} width={fallbackName.width}
                height={fallbackName.height} style={{ objectFit: "contain" }} />
            )}
          </div>

          <div style={{ display: "flex", marginTop: 38, justifyContent: "center", alignItems: "center" }}>
            <img src={headingLine.src} width={headingLine.width} height={headingLine.height}
              style={{ objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", width: 870, minHeight: 186,
            marginTop: 92, border: "5px dashed #2988f0", borderRadius: 32,
            background: "#f1f8ff", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "19px 36px" }}>
            <img src={codeLabel.src} width={codeLabel.width} height={codeLabel.height}
              style={{ objectFit: "contain" }} />
            <div style={{ display: "flex", marginTop: 4,
              fontSize: code.length > 18 ? 58 : code.length > 11 ? 78 : 113,
              fontWeight: 700, letterSpacing: 1, color: "#0b2344",
              maxWidth: 810, textAlign: "center" }}>
              {isCode ? code : withoutCode && (
                <img src={withoutCode.src} width={withoutCode.width} height={withoutCode.height}
                  style={{ objectFit: "contain" }} />
              )}
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 70, fontSize: 24,
            color: "#506985", letterSpacing: 0.5 }}>couponsnoor.com</div>
        </div>
      ),
      { width: 1080, height: 1350, fonts }
    );
    const png = Buffer.from(await image.arrayBuffer());
    const url = new URL(request.url);
    const webp = url.searchParams.get("format") === "webp";
    const output = webp
      ? await sharp(png).webp({ quality: 88 }).toBuffer()
      : await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": webp ? "image/webp" : "image/jpeg",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[instagram-preview] image generation failed", error);
    return new Response("Preview temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "120" },
    });
  }
}
