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
};

export default nextConfig;
