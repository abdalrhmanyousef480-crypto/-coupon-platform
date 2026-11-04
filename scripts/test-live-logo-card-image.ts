/**
 * Public-logo image regression test. Reads existing public Supabase logos,
 * never writes to Supabase or the production website.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { renderCardWebp } from "./card-image-renderer";

const samples = [
  {
    slug: "faisalaldayel",
    kind: "coupon" as const,
    storeName: "عطور فيصل الدايل",
    code: "ABBBA1",
    logoUrl: "https://gwqtzjqmvrcrvchqdvdi.supabase.co/storage/v1/object/public/store-logos/stores/7eba1bd4-33d4-49b3-bdd8-5a59ab1cd565.webp",
  },
  {
    slug: "firstcry",
    kind: "store" as const,
    storeName: "فيرستكراي | firstcry",
    code: "NW3",
    logoUrl: "https://gwqtzjqmvrcrvchqdvdi.supabase.co/storage/v1/object/public/store-logos/stores/b22793f3-f846-44ea-9eb1-93eeef9cb364.webp",
  },
];

async function main() {
  const output = path.join(process.cwd(), "card-preview");
  await fs.mkdir(output, { recursive: true });
  for (const sample of samples) {
    const image = await renderCardWebp(sample);
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, sample.kind === "store" ? 1200 : 800);
    assert.equal(metadata.height, metadata.width);
    assert.ok(image.length > 10000);
    await fs.writeFile(path.join(output, sample.slug + ".webp"), image);
    console.log("Generated public-logo preview:", sample.slug, metadata.width, image.length, "bytes");
  }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
