import { redirectOrNotFound } from "@/lib/redirects";

type LegacyParams = { params: Promise<{ legacyPath: string[] }> };

// Honor existing saved redirects outside modern routes (including Blogger URLs).
// Unknown URLs keep a real 404; never guess a destination or redirect everything home.
export async function generateMetadata({ params }: LegacyParams) {
  const { legacyPath } = await params;
  return redirectOrNotFound(`/${legacyPath.join("/")}`);
}

export default async function LegacyPage({ params }: LegacyParams) {
  const { legacyPath } = await params;
  return redirectOrNotFound(`/${legacyPath.join("/")}`);
}
