import { db } from "@/lib/db";
import { notFound, permanentRedirect, redirect } from "next/navigation";

// ============================================================
// يُستدعى من داخل أي صفحة ديناميكية (store/[slug], coupon، إلخ)
// قبل استدعاء notFound() — لو فيه Redirect محفوظ لهذا المسار
// القديم (لأنه اتغيّر من الأدمن)، نرجّعه بدل ما نعرض 404 ونخسر
// الفهرسة القديمة. راجع قسم 38 بالبرومبت.
// ============================================================
export async function findRedirect(fromPath: string) {
  return resolveRedirect(fromPath, (path) => db.redirect.findUnique({ where: { fromPath: path } }));
}

type RedirectTarget = { toPath: string; statusCode: number };
type RedirectLookup = (path: string) => Promise<RedirectTarget | null>;

/** Collapse saved chains; derive old coupon URLs from an authoritative store rename. */
export async function resolveRedirect(fromPath: string, lookup: RedirectLookup): Promise<RedirectTarget | null> {
  let current = fromPath;
  let found = false;
  let permanent = true;
  const visited = new Set<string>();
  for (let hop = 0; hop < 10; hop++) {
    const pathname = current.split(/[?#]/)[0];
    if (visited.has(pathname)) return null;
    visited.add(pathname);
    let entry = await lookup(pathname);
    if (!entry) {
      const couponPath = pathname.match(/^(\/store\/[^/]+)(\/coupon\/[^/]+)$/);
      if (couponPath) {
        const storeEntry = await lookup(couponPath[1]);
        if (storeEntry && /^\/store\/[^/?#]+$/.test(storeEntry.toPath)) {
          entry = { ...storeEntry, toPath: `${storeEntry.toPath}${couponPath[2]}` };
        }
      }
    }
    if (!entry) return found ? { toPath: current, statusCode: permanent ? 301 : 302 } : null;
    found = true;
    permanent &&= entry.statusCode === 301 || entry.statusCode === 308;
    current = entry.toPath;
    // External destinations are terminal. Protocol-relative/non-web values are invalid.
    if (!current.startsWith("/") || current.startsWith("//")) {
      try {
        const target = new URL(current);
        if (!["http:", "https:"].includes(target.protocol)) return null;
        return { toPath: current, statusCode: permanent ? 301 : 302 };
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Next's supported page redirects use 308 for permanent and 307 for temporary moves. */
export function redirectTo(target: RedirectTarget): never {
  if (target.statusCode === 301 || target.statusCode === 308) permanentRedirect(target.toPath);
  redirect(target.toPath);
}

export async function redirectOrNotFound(fromPath: string): Promise<never> {
  const target = await findRedirect(fromPath);
  if (target) redirectTo(target);
  notFound();
}
