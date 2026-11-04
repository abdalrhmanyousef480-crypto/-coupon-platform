import sharp from "sharp";

export type CardKind = "store" | "coupon";
export type CardInput = { kind: CardKind; storeName: string; logoUrl: string; code: string };

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
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
        !(host.endsWith(".supabase.co") || host.endsWith(".supabase.in") || host === "www.google.com")) return null;
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

export function cardSvg(input: CardInput, logo: string | null): string {
  const parts = splitStoreName(input.storeName);
  const main = parts.arabic || parts.latin || input.storeName;
  const secondary = parts.arabic ? parts.latin : "";
  const code = input.code.trim().slice(0, 36) || "أحدث العروض";
  const font = "'Noto Sans Arabic', 'DejaVu Sans', sans-serif";
  const logoSvg = logo
    ? '<image x="492" y="170" width="216" height="216" href="' + logo + '"/>'
    : '<text x="600" y="315" font-family="' + font + '" font-size="130" font-weight="700" fill="#14213D" text-anchor="middle">' + escapeXml([...main][0] || "ن") + '</text>';
  const other = secondary
    ? '<text x="600" y="555" text-anchor="middle" direction="ltr" font-family="' + font + '" font-size="' + fontSize(secondary, 44, 26, 24) + '" font-weight="700" fill="#686F7D">' + escapeXml(secondary) + '</text>'
    : '';
  const message = input.kind === "store" ? "أحدث أكواد الخصم والعروض" : "استخدم الكود عند الدفع";
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">' +
    '<rect width="1200" height="1200" fill="#F5F2ED"/>' +
    '<rect x="56" y="56" width="1088" height="1088" rx="64" fill="#FFFFFF" stroke="#E9E1D8" stroke-width="3"/>' +
    '<rect x="452" y="130" width="296" height="296" rx="52" fill="#F4F3EF" stroke="#E7E5E0" stroke-width="2"/>' +
    '<path d="M320 270 H405 M795 270 H880" stroke="#CBBFB0" stroke-width="3"/>' +
    logoSvg +
    '<text x="600" y="' + (secondary ? 476 : 517) + '" text-anchor="middle" direction="' + (parts.arabic ? "rtl" : "ltr") +
      '" unicode-bidi="plaintext" font-family="' + font + '" font-size="' + fontSize(main, 66, 31, 19) +
      '" font-weight="700" fill="#14213D">' + escapeXml(main) + '</text>' +
    other +
    '<path d="M260 657 H335 M865 657 H940" stroke="#CD3018" stroke-width="4"/>' +
    '<text x="600" y="675" text-anchor="middle" direction="rtl" font-family="' + font + '" font-size="72" font-weight="700" fill="#CD3018">كود الخصم</text>' +
    '<rect x="148" y="735" width="904" height="250" rx="38" fill="#14213D"/>' +
    '<rect x="165" y="752" width="870" height="216" rx="30" fill="none" stroke="#344362" stroke-width="3"/>' +
    '<text x="600" y="900" text-anchor="middle" direction="' + (/[\p{Script=Arabic}]/u.test(code) ? 'rtl' : 'ltr') +
      '" font-family="' + font + '" font-size="' + fontSize(code, 107, 36, 13) +
      '" font-weight="700" fill="#FFFFFF">' + escapeXml(code) + '</text>' +
    '<text x="600" y="1068" text-anchor="middle" direction="rtl" font-family="' + font + '" font-size="36" font-weight="700" fill="#686F7D">' + message + '</text>' +
    '</svg>';
}

export async function renderCardWebp(input: CardInput, loadLogo = true): Promise<Buffer> {
  const svg = cardSvg(input, loadLogo ? await trustedLogo(input.logoUrl) : null);
  const width = input.kind === "store" ? 1200 : 800;
  return sharp(Buffer.from(svg)).resize(width, width).webp({ quality: 88, effort: 5 }).toBuffer();
}
