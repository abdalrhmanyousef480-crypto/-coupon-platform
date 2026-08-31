# كوبون نور — Couponeta

منصة كوبونات وخصومات Production-ready، مبنية بـ Next.js 15 (App Router) + TypeScript + Prisma + PostgreSQL، مع لوحة تحكم كاملة لإدارة المحتوى بدون لمس الكود.

---

## المحتويات

1. [التقنيات المستخدمة](#التقنيات-المستخدمة)
2. [التثبيت المحلي](#التثبيت-المحلي)
3. [إعداد قاعدة البيانات](#إعداد-قاعدة-البيانات)
4. [التشغيل محليًا](#التشغيل-محليًا)
5. [النشر على Vercel](#النشر-على-vercel)
6. [كيف أضيف محتوى جديد؟](#كيف-أضيف-محتوى-جديد)
7. [بنية المشروع](#بنية-المشروع)
8. [الأمان](#الأمان)

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| اللغة | TypeScript |
| التصميم | Tailwind CSS |
| قاعدة البيانات | PostgreSQL عبر Prisma ORM |
| تسجيل الدخول | NextAuth.js (Credentials Provider) |
| التحقق من المدخلات | Zod + react-hook-form |
| الاستضافة المستهدفة | Vercel |

---

## التثبيت المحلي

### المتطلبات
- Node.js 18.18 أو أحدث
- حساب على [Supabase](https://supabase.com) أو [Neon](https://neon.tech) (قاعدة بيانات PostgreSQL مجانية) — أو أي PostgreSQL آخر

### خطوات التثبيت

```bash
# 1. ثبّت الحزم
npm install

# 2. انسخ ملف البيئة وعبّي القيم
cp .env.example .env
```

افتح `.env` وعبّي:

```env
DATABASE_URL="رابط-قاعدة-البيانات-من-Supabase-أو-Neon"
NEXTAUTH_SECRET="نص-عشوائي-طويل"   # ولّده بأمر: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## إعداد قاعدة البيانات

### الخطوة 1: أنشئ قاعدة بيانات مجانية

أسهل خيار: [Supabase](https://supabase.com) (مجاني):
1. أنشئ حساب ومشروع جديد
2. من **Settings → Database → Connection String → URI**، انسخ الرابط
3. الصقه في `DATABASE_URL` بملف `.env` (استبدل `[YOUR-PASSWORD]` بكلمة مرور قاعدة البيانات الحقيقية)

### الخطوة 2: أنشئ الجداول

```bash
npm run db:push
```

هذا الأمر يقرأ `prisma/schema.prisma` وينشئ كل الجداول تلقائيًا بقاعدة البيانات.

### الخطوة 3: عبّي بيانات تجريبية

```bash
npm run db:seed
```

هذا بيضيف:
- حساب أدمن جاهز: `admin@couponeta.com` / `Admin@123456`
- 5 متاجر، 6 كوبونات، 5 تصنيفات، مقالة واحدة (بيانات واقعية للمعاينة)

**⚠️ مهم جدًا:** غيّر كلمة مرور الأدمن فورًا بعد أول تسجيل دخول (من قاعدة البيانات مباشرة أو Prisma Studio)، ولا تترك بيانات الدخول الافتراضية على موقع منشور فعليًا.

---

## التشغيل محليًا

```bash
npm run dev
```

- الموقع العام: http://localhost:3000
- لوحة التحكم: http://localhost:3000/admin/login

### أوامر مفيدة أخرى

```bash
npm run db:studio   # واجهة رسومية لتصفح/تعديل قاعدة البيانات مباشرة
npm run build       # بناء نسخة الإنتاج (يتأكد من عدم وجود أخطاء)
npm run lint        # فحص جودة الكود
```

---

## النشر على Vercel

### الطريقة: GitHub → Vercel → Deploy

1. **ارفع المشروع على GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <رابط-مستودعك-على-GitHub>
   git push -u origin main
   ```

2. **من [vercel.com](https://vercel.com):**
   - New Project → استورد المستودع من GitHub
   - Vercel بيكتشف Next.js تلقائيًا

3. **أضف متغيرات البيئة** (Project Settings → Environment Variables):
   ```
   DATABASE_URL=رابط قاعدة بياناتك الحقيقية (Production)
   NEXTAUTH_SECRET=نفس القيمة أو قيمة جديدة عشوائية
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
   ```

4. **اضغط Deploy.** Vercel بيشغّل `prisma generate && next build` تلقائيًا (معرّف بـ `package.json`).

5. **بعد أول نشر، شغّل الـ migration وseed مرة وحدة** (من جهازك، موجّه لقاعدة بيانات الإنتاج نفسها):
   ```bash
   # تأكد إن .env عندك يشاور لقاعدة بيانات الإنتاج قبل هذا الأمر
   npm run db:push
   npm run db:seed
   ```

### ربط دومين مخصص
Project Settings → Domains → أضف دومينك، وحدّث `NEXTAUTH_URL` و`NEXT_PUBLIC_SITE_URL` بالقيمة الجديدة.

---

## كيف أضيف محتوى جديد؟

كل الإضافة من لوحة التحكم `/admin` — بدون لمس أي سطر كود.

### 1. كيف أضيف متجرًا جديدًا؟

```
لوحة التحكم → المتاجر → إضافة متجر
→ عبّي: الاسم، الرابط (يتولّد تلقائيًا)، الشعار، الوصف، التصنيف
→ اضغط "إضافة المتجر"
```

**يحدث تلقائيًا خلف الكواليس:**
- تُنشأ صفحة `/store/[slug]` فورًا وتكون قابلة للفهرسة
- Metadata (العنوان، الوصف، Canonical، Open Graph) تتولّد تلقائيًا لو تركت حقول SEO فاضية
- المتجر يظهر بصفحة `/stores` وبصفحة تصنيفه
- يُضاف لـ `sitemap.xml` تلقائيًا
- Structured Data (BreadcrumbList) تُبنى تلقائيًا

### 2. كيف أضيف كوبونًا جديدًا؟

```
لوحة التحكم → الكوبونات → إضافة كوبون
→ اختر المتجر
→ عبّي: العنوان، الكود (لو النوع "كود خصم")، نص الخصم، الوصف
→ اضغط "إضافة الكوبون"
```

**يحدث تلقائيًا:**
- تُنشأ صفحة `/store/[store-slug]/coupon/[coupon-slug]` فورًا
- الكوبون يظهر بصفحة المتجر تلقائيًا (في قائمة "أفضل أكواد الخصم")
- يظهر بصفحة `/coupons` العامة
- Metadata + JSON-LD (FAQPage, BreadcrumbList) تُبنى تلقائيًا
- يُضاف لـ sitemap.xml

### 3. كيف أضيف تصنيفًا جديدًا؟

```
لوحة التحكم → التصنيفات → إضافة تصنيف
→ عبّي: الاسم (عربي/إنجليزي)، الرابط، الوصف، الأيقونة
→ اضغط "إضافة التصنيف"
```

بعدها، لما تضيف متجرًا أو كوبونًا، رح يظهر بقائمة التصنيفات المتاحة للاختيار.

### 4. كيف أضيف مقالة مدونة؟

```
لوحة التحكم → المقالات → إضافة مقال
→ عبّي: العنوان، الرابط، الصورة الرئيسية، المقتطف، المحتوى
→ اختر الحالة: مسودة (Draft) أو منشور (Published)
→ اضغط "إضافة المقال"
```

**نصيحة كتابة المحتوى:** افصل بين الفقرات بسطر فاضي، وضع `##` قبل أي عنوان فرعي داخل النص، مثال:

```
هذه فقرة مقدمة عن الموضوع.

## العنوان الفرعي الأول

هذه فقرة تحت العنوان الفرعي.
```

المقال يظهر بـ `/blog` فقط لو حالته "منشور".

### 5. كيف أضيف نوع صفحة جديد مستقبلًا (مثلًا `/deals` أو `/brand/[slug]`)؟

الخطوات العامة لأي نوع محتوى جديد:

1. **قاعدة البيانات:** أضف `model` جديد بـ `prisma/schema.prisma` (بنفس نمط حقول SEO الموجودة بباقي الجداول: `seoTitle`, `seoDescription`, `noindex`...)، ثم شغّل `npm run db:push`
2. **الـ Route:** أنشئ مجلد جديد تحت `src/app/` يطابق شكل الرابط اللي تبيه (مثلًا `src/app/deals/page.tsx` أو `src/app/brand/[slug]/page.tsx`)
3. **الـ Components:** أنشئ مكونات عرض جديدة تحت `src/components/public/` لو المحتوى مختلف شكليًا عن الموجود، أو أعد استخدام `CouponCard`/`StoreCard` الموجودة لو الشكل مشابه
4. **SEO:** أضف دالة `xxxMetadata()` جديدة بـ `src/lib/seo.ts` بنفس نمط `storeMetadata`/`couponMetadata` الموجودة
5. **Sitemap:** أضف استعلام جديد بـ `src/app/sitemap.ts` يجيب كل صفوف الجدول الجديد ويحولها لروابط
6. **Admin:** أنشئ صفحات `src/app/admin/[type]/` (list, new, [id]) + Server Actions بـ `src/lib/actions-[type].ts`، بنفس نمط `actions-store.ts` بالضبط (نسخ وتعديل أسماء الحقول)

هذا النمط (Content-driven) يعني: كل نوع محتوى جديد يتكرر فيه نفس البنية (Schema → Route → SEO → Sitemap → Admin CRUD)، فبمجرد ما تبني نوع واحد صح، إضافة أنواع تانية تصير نسخ-وتعديل سريع.

---

## بنية المشروع

```
prisma/
  schema.prisma        ← كل نماذج قاعدة البيانات
  seed.ts               ← بيانات تجريبية

src/
  app/
    (صفحات الموقع العام: /, /stores, /store/[slug], /coupons, /category/[slug], /blog...)
    admin/               ← لوحة التحكم (محمية بـ middleware)
    api/auth/            ← NextAuth API route
    sitemap.ts           ← Sitemap ديناميكي
    robots.ts            ← Robots.txt ديناميكي

  components/
    ui/                  ← Design System (Button, Form fields)
    public/               ← CouponCard, StoreCard, Header, Footer...
    admin/                 ← جداول ونماذج لوحة التحكم

  lib/
    db.ts                 ← Prisma Client
    auth.ts                ← إعدادات NextAuth
    seo.ts                  ← نظام SEO المركزي (generateMetadata helpers)
    validations.ts           ← Zod schemas
    actions-*.ts              ← Server Actions لكل نوع محتوى (CRUD)
    i18n.ts                    ← نصوص الواجهة (عربي/إنجليزي)
    utils.ts                    ← دوال مساعدة عامة

  middleware.ts          ← حماية /admin
```

---

## الأمان

- كل صفحات `/admin` محمية بـ middleware على مستوى الشبكة (Edge) — ما فيه احتمال وصول بدون تسجيل دخول صحيح
- كلمات المرور مُشفّرة بـ bcrypt، لا تُخزّن أبدًا كنص صريح
- كل المدخلات تُتحقق منها بـ Zod قبل لمس قاعدة البيانات (Server-side، مش بس بالمتصفح)
- الأسرار (`DATABASE_URL`, `NEXTAUTH_SECRET`) بمتغيرات بيئة فقط، أبدًا بالكود
- `/admin` و `/api` ممنوعين من الفهرسة عبر `robots.ts`

---

## ملاحظة حول السيو (SEO)

هذا المشروع مبني بأفضل أساس تقني ممكن للسيو (Metadata مستقلة لكل صفحة، Canonical، Structured Data، Sitemap ديناميكي، Internal Linking، أداء عالي). لكن **الظهور الفعلي بنتائج جوجل يعتمد أيضًا على عوامل خارج نطاق الكود**: جودة المحتوى المستمرة، الروابط الخارجية (Backlinks)، عمر الدومين، والمنافسة. هذا المشروع يعطيك الأساس الصحيح للنمو — النتيجة النهائية تعتمد على استمرارية إضافة محتوى مفيد وحقيقي.
