import { db } from "@/lib/db";
// Legacy image link: lightweight redirect, never render ImageResponse or sharp.
export async function GET(_req: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await db.store.findFirst({
    where: { slug: storeSlug, isPublished: true },
    select: { cardImageUrl: true, logoUrl: true },
  });
  if (!store) return new Response("Not found", { status: 404 });
  return new Response(null, {
    status: 307,
    headers: { Location: store.cardImageUrl || store.logoUrl, "Cache-Control": "public, max-age=3600" },
  });
}
