import sharp from "sharp";

export type CardKind = "store" | "coupon";
export type CardInput = { kind: CardKind; storeName: string; logoUrl: string; code: string; hasCode?: boolean };

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Whole phrases, never separated words. Two independent text nodes for Arabic and English.
export function splitStoreName(name: string): { arabic: string; latin: string } {
  const raw = name.trim().replace(/\s+/g, " ");
  const chunks = raw.split(/\s*[|｜]\s*/);
  const arabic = chunks.flatMap((chunk) => chunk.match(/[\p{Script=Arabic}][\p{Script=Arabic}\p{N}\s]*/gu) || [])
    .map((s) => s.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const latin = chunks.flatMap((chunk) => chunk.match(/[A-Za-z][A-Za-z0-9 ._-]*/g) || [])
    .map((s) => s.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return { arabic: arabic || (latin ? "" : raw), latin };
}

function fontSize(s: string, base: number, floor: number, target: number): number {
  return Math.max(floor, Math.round(base * Math.min(1, target / Math.max(1, [...s].length))));
}

async function trustedLogo(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const projectHost = new URL(process.env.SUPABASE_URL || "https://gwqtzjqmvrcrvchqdvdi.supabase.co").hostname;
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
        !(host === projectHost || host === "www.google.com")) return null;
    const res = await fetch(parsed.toString(), { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!res.ok || Number(res.headers.get("content-length") || "0") > 3_000_000) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 3_000_000 || buffer.length < 10) return null;
    const png = await sharp(buffer, { limitInputPixels: 8_000_000 })
      .resize(216, 216, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    return "data:image/png;base64," + png.toString("base64");
  } catch {
    return null;
  }
}

// Estimate visual widths so both scripts share ONE centered baseline without
// relying on SVG bidi reordering. Every language remains a single text node.
function approxTextWidth(value: string, size: number, latin: boolean): number {
  return [...value].reduce((total, character) => {
    if (/\s/u.test(character)) return total + size * 0.29;
    if (latin && /[ilI.,'!|]/.test(character)) return total + size * 0.29;
    if (latin && /[MWmw@]/.test(character)) return total + size * 0.82;
    return total + size * (latin ? 0.57 : 0.59);
  }, 0);
}

export function cardSvg(input: CardInput, logo: string | null): string {
  const parts = splitStoreName(input.storeName);
  const arabic = parts.arabic;
  const latin = parts.latin;
  const main = arabic || latin || input.storeName;
  const mixed = Boolean(arabic && latin);
  const nameFont = "'Noto Sans Arabic', 'DejaVu Sans', sans-serif";
  const code = input.code.trim().slice(0, 36) || "أحدث العروض";
  const hasCode = input.hasCode !== false && code !== "أحدث العروض";
  const heading = hasCode ? "كود الخصم" : "كوبونات وعروض";
  const nameMaxWidth = 988;
  let nameSize = 66;
  const separatorWidth = mixed ? 48 : 0;
  while (nameSize > 27 &&
    approxTextWidth(main, nameSize, Boolean(!arabic)) +
    (mixed ? approxTextWidth(latin, nameSize, true) + separatorWidth : 0) > nameMaxWidth) {
    nameSize -= 1;
  }
  const arabicWidth = approxTextWidth(main, nameSize, !arabic);
  const latinWidth = mixed ? approxTextWidth(latin, nameSize, true) : 0;
  const totalNameWidth = arabicWidth + (mixed ? separatorWidth + latinWidth : 0);
  const nameStart = 600 - totalNameWidth / 2;
  const firstCenter = nameStart + arabicWidth / 2;
  const dashCenter = nameStart + arabicWidth + separatorWidth / 2;
  const latinCenter = nameStart + arabicWidth + separatorWidth + latinWidth / 2;
  const logoSvg = logo
    ? '<image x="505" y="102" width="190" height="190" href="' + logo + '"/>'
    : '<text x="600" y="235" text-anchor="middle" direction="' + (arabic ? "rtl" : "ltr") +
      '" font-family="' + nameFont + '" font-size="126" font-weight="700" fill="#13162C">' +
      escapeXml([...main][0] || "ن") + '</text>';
  const displayName =
    '<text data-role="store-name" x="' + firstCenter.toFixed(1) + '" y="434" text-anchor="middle" direction="' +
    (arabic ? "rtl" : "ltr") + '" font-family="' + nameFont + '" font-size="' + nameSize +
    '" font-weight="800" fill="#11182E">' + escapeXml(main) + '</text>' +
    (mixed
      ? '<text data-role="store-name-separator" x="' + dashCenter.toFixed(1) +
        '" y="434" text-anchor="middle" direction="ltr" font-family="' + nameFont +
        '" font-size="' + nameSize + '" font-weight="800" fill="#EA087B">-</text>' +
        '<text data-role="store-name-latin" x="' + latinCenter.toFixed(1) +
        '" y="434" text-anchor="middle" direction="ltr" font-family="' + nameFont +
        '" font-size="' + nameSize + '" font-weight="800" fill="#11182E">' +
        escapeXml(latin) + '</text>'
      : '');
  const displayedCode = hasCode ? code : "تسوق بأفضل العروض";
  const codeSize = fontSize(displayedCode, 175, 43, 9);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">' +
    '<defs>' +
      '<linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#F00081"/><stop offset="1" stop-color="#C90064"/></linearGradient>' +
      '<linearGradient id="corner" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FF52A5"/><stop offset="1" stop-color="#FFD1E6"/></linearGradient>' +
    '</defs>' +
    '<rect width="1200" height="1200" fill="#FFFCFD"/>' +
    '<path d="M0 0 H418 C343 91 231 81 170 208 C115 319 47 335 0 355 Z" fill="url(#corner)"/>' +
    '<path d="M0 0 H275 C210 70 157 88 117 166 C70 261 32 275 0 290 Z" fill="#F72C90"/>' +
    '<path d="M1200 850 C1097 874 1066 966 984 1042 C913 1108 793 1144 685 1200 H1200 Z" fill="#FFE0EC"/>' +
    '<path d="M1200 1040 C1138 1082 1088 1159 996 1200 H1200 Z" fill="#F72C90"/>' +
    '<rect x="378" y="72" width="444" height="246" rx="82" fill="#FFFFFF" stroke="#F2EDF1" stroke-width="4"/>' +
    logoSvg +
    '<path d="M900 121 l29 -57" stroke="#F5B400" stroke-width="20" stroke-linecap="round"/>' +
    '<path d="M945 161 l55 -23" stroke="#F5B400" stroke-width="20" stroke-linecap="round"/>' +
    '<path d="M299 516 l-27 -34" stroke="#F5B400" stroke-width="17" stroke-linecap="round"/>' +
    '<path d="M258 552 l-40 -13" stroke="#F5B400" stroke-width="17" stroke-linecap="round"/>' +
    displayName +
    '<rect x="89" y="505" width="1022" height="208" rx="85" fill="url(#ribbon)"/>' +
    '<text data-role="coupon-heading" x="600" y="648" text-anchor="middle" direction="rtl" font-family="' +
      nameFont + '" font-size="' + (hasCode ? 125 : 93) +
      '" font-weight="900" fill="#FFFFFF">' + heading + '</text>' +
    '<rect x="137" y="761" width="926" height="269" rx="67" fill="#FFFFFF" stroke="#F02583" stroke-width="8" stroke-dasharray="26 17"/>' +
    '<circle cx="138" cy="896" r="25" fill="#FFFCFD"/>' +
    '<circle cx="1062" cy="896" r="25" fill="#FFFCFD"/>' +
    '<text data-role="coupon-code" x="600" y="951" text-anchor="middle" direction="' +
      (/[\p{Script=Arabic}]/u.test(displayedCode) ? "rtl" : "ltr") +
      '" font-family="' + nameFont + '" font-size="' + codeSize +
      '" font-weight="900" fill="#12182D">' + escapeXml(displayedCode) + '</text>' +
    '<g transform="translate(365 1092) rotate(-16)"><rect width="64" height="56" rx="12" fill="#E9007A"/>' +
      '<circle cx="17" cy="13" r="6" fill="#FFFFFF"/>' +
      '<text x="31" y="42" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#FFFFFF" font-weight="800">%</text></g>' +
    '<text data-role="couponsnoor-brand" x="466" y="1138" direction="rtl" font-family="' + nameFont +
      '" font-size="55" font-weight="800" fill="#14182C">كوبون نور</text>' +
    '</svg>';
}

export async function renderCardWebp(input: CardInput, loadLogo = true): Promise<Buffer> {
  const logo = loadLogo ? await trustedLogo(input.logoUrl) : null;
  // Never save a lower-quality permanent image if the merchant logo is temporarily unavailable.
  // The worker can retry on the next scheduled pass without changing any public URLs.
  if (loadLogo && !logo) throw new Error("Could not load merchant logo; image generation will retry");
  const svg = cardSvg(input, logo);
  const width = input.kind === "store" ? 1200 : 800;
  return sharp(Buffer.from(svg)).resize(width, width).webp({ quality: 88, effort: 5 }).toBuffer();
}
