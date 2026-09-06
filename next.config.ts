import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp حزمة native (binaries) — لازم تبقى خارج bundle الخادم بدل ما
  // يحاول webpack يحزمها، وإلا ينكسر الـ build (مطلوبة لتحويل شعارات
  // المتاجر المرفوعة إلى WebP، راجع src/lib/actions-upload.ts)
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // شعارات المتاجر المرفوعة عبر لوحة التحكم (Supabase Storage)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // ضيف هون أي دومين تاني رح تستضيف عليه صور المتاجر/الكوبونات
      // (مثلًا لو ربطت Cloudinary أو Vercel Blob لاحقًا)
    ],
  },
  eslint: {
    // نخلي الـ lint يشتغل يدويًا (npm run lint) بدل ما يوقف الـ build،
    // لأنه ببيئة الإنتاج الأولى بيكون فيه تحذيرات بسيطة طبيعية
    ignoreDuringBuilds: false,
  },
  experimental: {
    // كل worker بولّد صفحات SSG بيشارك نفس PrismaClient الواحد (singleton
    // معطّل عمدًا وقت build، راجع db.ts) — بالـ default (تزامن 8 صفحات/worker)
    // هذا يعني حتى 16-24+ استعلام Prisma متزامن عالنفس الاتصال الواحد، وقت
    // ذروة كذا worker مع بعض بيضغط على PgBouncer (Supabase) لحد الفشل بـ
    // P2024 "Timed out fetching a new connection from the pool" — بشكل
    // عشوائي (أي صفحة SSG تصادف توصل وقت الذروة). جربنا تحديد connection_limit
    // على DATABASE_URL كحل، لكنه بالعكس زوّد الفشل (بيقيّد كل worker على
    // اتصال واحد بس، فيصير queueing أسوأ جوا نفس الـ worker). الحل الأسلم:
    // نقلّل التزامن (أقل ضغط لحظي) ونخلي Next يعيد محاولة أي صفحة تفشل
    // بخطأ عابر بدل ما يفشّل الـ build كله فورًا.
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 4,
  },
};

export default nextConfig;
