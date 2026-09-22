import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, IBM_Plex_Mono, Tajawal, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { buildMetadata, websiteJsonLd, organizationJsonLd } from "@/lib/seo";
import { getSiteSettings } from "@/lib/site-settings";
import { Toaster } from "sonner";

// adjustFontFallback: false — تعطيل خط next/font المحلي التلقائي (Arial على ويندوز).
// هالخط الاحتياطي ما بيقيّد unicode-range، فبيلتقط النص العربي قبل ما يوصل
// لـ Tajawal بسلسلة fontFamily (راجع tailwind.config.ts)، وArial بيرسم
// العربي متلاصق/مضغوط مقارنة بـ Tajawal — هذا سبب التصاق النص بعناوين
// الأقسام وأسئلة FAQ على أجهزة فيها Arial (ويندوز)، بينما الجوال ما فيه
// Arial فيرجع صح لـ Tajawal تلقائيًا.
// preload: false على jakarta/inter/mono — الموقع عربي بالكامل (ما فيه
// نسخة /en فعلية، راجع CLAUDE.md)، فهاي الخطوط اللاتينية-فقط (unicode-range
// ما بيغطي عربي) نادرًا ما تُستخدم فعليًا لرسم أي حرف مرئي بالصفحة، لكن
// preload الافتراضي (true) كان يجبر المتصفح يحمّلها eagerly كـ high-priority
// requests تتنافس على الباندويدث مع Tajawal (الخط الفعلي المستخدم لرسم
// العنوان H1 نفسه = عنصر LCP بكل صفحات الموقع) — قياس Lighthouse فعلي
// أظهر render-blocking chain بـ7 ملفات woff2 preloaded تأخّر LCP ~800-1160ms
// على الرئيسية/المتجر/الكوبون. الخطوط لسا موجودة ومتاحة لو احتاجتها كلمة
// لاتينية وسط نص عربي (اسم متجر مختلط مثلاً) — بس تتحمّل lazily بدل ما
// تُعطى أولوية preload على حساب الخط الحرج فعليًا.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["500", "600", "700", "800"], adjustFontFallback: false, preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700"], adjustFontFallback: false, preload: false });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["600", "700"], preload: false });
const tajawal = Tajawal({ subsets: ["arabic"], variable: "--font-tajawal", weight: ["400", "500", "700", "800"] });
// خط مخصص لعرض أكواد الكوبونات فقط — هوية بصرية مختلفة عن أي خط تاني
// بالموقع (راجع CouponCard.tsx)، Premium ومقروء بوضوح كـ "كود".
const codeFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", weight: ["700"] });

export const metadata: Metadata = buildMetadata({
  title: "كوبون نور — وفر أكثر مع أكواد الخصم",
  description: "آلاف الكوبونات الموثقة من متاجرك المفضلة، محدثة يوميًا.",
  path: "/",
  locale: "ar",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // نفس getSiteSettings() اللي بيستدعيها SiteFooter أصلًا بكل صفحة —
  // مكاش بـ React cache()، فما فيه استعلام DB إضافي فعليًا لنفس الطلب.
  // sameAs بيتبنى بس من الحسابات المضبوطة فعليًا (مش null/فاضية).
  const settings = await getSiteSettings();
  const sameAs = [
    settings?.facebookUrl,
    settings?.instagramUrl,
    settings?.twitterUrl,
    settings?.tiktokUrl,
    settings?.snapchatUrl,
  ].filter((url): url is string => !!url?.trim());

  const jsonLd = [websiteJsonLd("ar"), organizationJsonLd("ar", sameAs)];
  return (
    <html lang="ar" dir="rtl" className={`${jakarta.variable} ${inter.variable} ${mono.variable} ${tajawal.variable} ${codeFont.variable}`}>
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
