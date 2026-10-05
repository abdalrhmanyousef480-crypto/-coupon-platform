import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "لوحة التحكم — كوبون نور",
  description: "لوحة إدارة كوبون نور.",
  path: null, locale: "ar", noindex: true,
});

export default function AdminMetadataLayout({ children }: { children: ReactNode }) {
  return children;
}
