import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono, Tajawal } from "next/font/google";
import "./globals.css";
import { buildMetadata, websiteJsonLd, organizationJsonLd } from "@/lib/seo";
import { Toaster } from "sonner";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["500", "600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["600", "700"] });
const tajawal = Tajawal({ subsets: ["arabic"], variable: "--font-tajawal", weight: ["400", "500", "700", "800"] });

export const metadata: Metadata = buildMetadata({
  title: "كوبون نور — وفر أكثر مع أفضل أكواد الخصم",
  description: "آلاف الكوبونات الموثقة من متاجرك المفضلة، محدثة يوميًا.",
  path: "/",
  locale: "ar",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = [websiteJsonLd("ar"), organizationJsonLd("ar")];
  return (
    <html lang="ar" dir="rtl" className={`${jakarta.variable} ${inter.variable} ${mono.variable} ${tajawal.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
