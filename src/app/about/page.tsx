import Link from "next/link";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import {
  Sparkles, ShieldCheck, Store, LayoutGrid, BadgeCheck, Eye, Percent, HandCoins,
} from "lucide-react";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "من نحن — كوبون نور", description: "تعرّف على منصة كوبون نور ورسالتنا.", path: "/about", locale: "ar",
});

const VALUES: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Eye, title: "ثقة وشفافية كاملة", description: "لا نتلاعب بترتيب الكوبونات ولا نخفي أي معلومة عنك — كل ما تشوفه واضح وصريح." },
  { icon: BadgeCheck, title: "تحقق يدوي حقيقي", description: "فريقنا يجرّب كل كود بنفسه قبل نشره، مو مجرد نسخ من مصدر تاني." },
  { icon: Percent, title: "توفير حقيقي بدون خداع", description: "نوضّح نوع العرض بدقة — كود خصم، عرض مباشر، أو كاش باك — بدون مبالغة أو وعود فارغة." },
  { icon: LayoutGrid, title: "سهولة بدون تعقيد", description: "تصفح وابحث بحرية بدون تسجيل حساب أو تقديم أي بيانات شخصية." },
];

const STEPS: { title: string; description: string }[] = [
  { title: "نجمع العروض", description: "نتابع المتاجر الإلكترونية باستمرار لحصر أحدث أكواد الخصم والعروض المتاحة." },
  { title: "نجرّب الكود يدويًا", description: "فريق التحرير يختبر كل كود بنفسه للتأكد أنه يعمل فعليًا قبل نشره." },
  { title: "شارة «تم التحقق»", description: "نضيف الشارة مع تاريخ «آخر تحديث» الفعلي، حتى تعرف مدى حداثة المعلومة." },
  { title: "مراجعة دورية", description: "أولوية أعلى للأكواد القريبة من الانتهاء، وإزالة أي كود توقف عن العمل فورًا." },
];

export default async function AboutPage() {
  const locale = "ar" as const;
  const [storeCount, couponCount, verifiedCount, categoryCount] = await Promise.all([
    db.store.count({ where: { isPublished: true } }),
    db.coupon.count({ where: { isPublished: true } }),
    db.coupon.count({ where: { isPublished: true, isVerified: true } }),
    db.category.count({ where: { isPublished: true } }),
  ]);

  return (
    <>
      <SiteHeader locale={locale} />
      <main>
        <div className="max-w-container mx-auto px-5 pt-6">
          <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            <span className="text-ink-faint">‹</span>
            <span aria-current="page" className="text-ink">من نحن</span>
          </nav>
        </div>

        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden py-16 text-center md:py-24">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute inset-0"
              style={{ backgroundImage: "radial-gradient(rgba(20,33,61,0.07) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
            />
            <div className="absolute -top-32 start-1/2 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl" />
            <div className="absolute top-4 end-[8%] h-72 w-72 rounded-full bg-accent/[0.10] blur-3xl" />
            <div className="absolute -bottom-20 start-[6%] h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl" />
          </div>

          <div className="max-w-container mx-auto px-5">
            <ScrollReveal>
              <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-bold text-accent ring-1 ring-inset ring-accent/15">
                <Sparkles className="h-3.5 w-3.5" /> من نحن
              </span>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <h1 className="mx-auto mb-5 max-w-3xl text-[36px] font-extrabold leading-[1.15] tracking-tight sm:text-5xl md:text-6xl">
                نجمع لك أكواد الخصم من متاجرك المفضلة في مكان واحد
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={160}>
              <p className="mx-auto mb-10 max-w-xl text-base text-ink-muted md:text-lg">
                كوبون نور منصة عربية تجمع أكواد الخصم الفعّالة من متاجرك المفضلة، تتحقق من كل كود يدويًا، وتعرضه لك بوضوح — بدون تسجيل حساب، وبدون مفاجآت عند الدفع.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={240}>
              <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4">
                <HeroStat icon={Store} value={`+${storeCount}`} label="متجر موثوق" />
                <HeroStat icon={ShieldCheck} value={`${verifiedCount}`} label="تم التحقق منه" accent />
                <HeroStat icon={LayoutGrid} value={`${categoryCount}`} label="تصنيف" />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ---------- STORY / MISSION ---------- */}
        <Section>
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <ScrollReveal>
              <div>
                <Eyebrow icon={Sparkles}>قصتنا</Eyebrow>
                <h2 className="mb-4 text-[28px] font-extrabold leading-tight tracking-tight md:text-[32px]">
                  مهمتنا: مصداقية قبل الكمية
                </h2>
                <p className="mb-4 leading-relaxed text-ink-muted">
                  أكبر مشكلة في مواقع الكوبونات عمومًا أن نصف الأكواد المعروضة منتهية الصلاحية أو لا تعمل من الأساس. لسنا متجرًا ولا وسيطًا في عملية الشراء؛ دورنا ينحصر في تجميع العروض المتاحة من المتاجر الإلكترونية، والتحقق منها، وتقديمها لك بشكل يسهل استخدامه.
                </p>
                <p className="leading-relaxed text-ink-muted">
                  مهمتنا الأساسية معالجة هذه المشكلة تحديدًا: نفضّل عرض عدد أقل من الكوبونات لكن بمصداقية أعلى، وأن نقول لك بصراحة{" "}
                  <span className="font-semibold text-ink">«لا يوجد كوبون فعّال حاليًا لهذا المتجر»</span> بدل عرض كود لا يعمل.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={120}>
              <MissionVisual verifiedCount={verifiedCount} />
            </ScrollReveal>
          </div>
        </Section>

        {/* ---------- VALUES GRID ---------- */}
        <section className="relative overflow-hidden border-y border-border bg-surface-alt py-20">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="max-w-container mx-auto px-5">
            <ScrollReveal>
              <div className="mx-auto mb-12 max-w-xl text-center">
                <Eyebrow icon={ShieldCheck} center>ليش تثق فينا</Eyebrow>
                <h2 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[32px]">ماذا يميزنا</h2>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v, i) => (
                <ScrollReveal key={v.title} delay={i * 90}>
                  <ValueCard {...v} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- VERIFICATION PROCESS ---------- */}
        <Section>
          <ScrollReveal>
            <div className="mx-auto mb-14 max-w-xl text-center">
              <Eyebrow icon={BadgeCheck} center>كيف نعمل</Eyebrow>
              <h2 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[32px]">كيف نتحقق من كل كوبون</h2>
            </div>
          </ScrollReveal>
          <div className="relative grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-6">
            <span aria-hidden="true" className="absolute top-6 hidden h-px w-full bg-gradient-to-r from-transparent via-border-strong to-transparent md:block" />
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.title} delay={i * 100}>
                <StepCard index={i + 1} {...s} />
              </ScrollReveal>
            ))}
          </div>
        </Section>

        {/* ---------- REVENUE TRANSPARENCY CALLOUT ---------- */}
        <Section className="pt-0">
          <ScrollReveal>
            <div className="mx-auto flex max-w-3xl gap-4 rounded-lg border-s-4 border-accent bg-accent-soft/40 p-6 md:p-8">
              <HandCoins className="h-6 w-6 shrink-0 text-accent" />
              <div>
                <h3 className="mb-2 text-base font-bold text-primary md:text-lg">بصراحة، كيف نربح؟</h3>
                <p className="leading-relaxed text-ink-muted">
                  نربح أحيانًا عمولة من المتجر عبر روابط تسويق بالعمولة (affiliate) عند الشراء بعد الضغط على أحد روابطنا، بدون أي تكلفة إضافية عليك. هذه العمولة لا تؤثر على السعر الذي تدفعه، ولا على ترتيب الكوبونات المعروضة — هي فقط مصدر تمويل الموقع ليبقى مجانيًا لك.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </Section>

        {/* ---------- TRUST / STATS BAND ---------- */}
        <section className="relative overflow-hidden bg-primary py-20 text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 end-[10%] h-72 w-72 rounded-full bg-accent/[0.15] blur-3xl" />
            <div className="absolute -bottom-24 start-[8%] h-72 w-72 rounded-full bg-white/[0.05] blur-3xl" />
          </div>
          <div className="max-w-container mx-auto px-5 text-center">
            <ScrollReveal>
              <Eyebrow icon={Sparkles} center light>أرقام حقيقية</Eyebrow>
              <h2 className="mx-auto mb-4 max-w-lg text-[28px] font-extrabold leading-tight tracking-tight text-white md:text-[32px]">
                هذي مو أرقام تسويقية
              </h2>
              <p className="mx-auto mb-12 max-w-lg text-white/70">
                كل رقم هون هو حالة الموقع الفعلية الآن — وكل كوبون «تم التحقق منه» جُرّب يدويًا من فريقنا قبل نشره.
              </p>
            </ScrollReveal>
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 md:grid-cols-4">
              <StatBlock value={`+${storeCount}`} label="متجر موثوق" delay={0} />
              <StatBlock value={`+${couponCount}`} label="كوبون منشور" delay={90} />
              <StatBlock value={`${verifiedCount}`} label="تم التحقق منه" delay={180} />
              <StatBlock value={`${categoryCount}`} label="تصنيف" delay={270} />
            </div>
          </div>
        </section>

        {/* ---------- COMMITMENT ---------- */}
        <Section>
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow icon={Eye} center>التزامنا تجاهك</Eyebrow>
              <h2 className="mb-4 text-[26px] font-extrabold leading-tight tracking-tight md:text-[28px]">شفافية كاملة، دايمًا</h2>
              <p className="leading-relaxed text-ink-muted">
                لا نتلاعب بترتيب الكوبونات لصالح عمولة أعلى، ولا نخفي أي معلومة تخص العرض. إذا واجهت كوبونًا لا يعمل،{" "}
                <Link href="/contact" className="font-semibold text-accent hover:underline">تواصل معنا</Link>{" "}
                وسنحدّثه أو نزيله بأسرع وقت. تقدر أيضًا تطّلع على{" "}
                <Link href="/editorial-policy" className="font-semibold text-accent hover:underline">سياسة التحرير</Link>{" "}
                لمعرفة كيف نختار وننشر كل عرض.
              </p>
            </div>
          </ScrollReveal>
        </Section>

        {/* ---------- CTA ---------- */}
        <section className="px-5 pb-20">
          <ScrollReveal>
            <div className="max-w-container mx-auto overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-hover px-6 py-14 text-center shadow-lg md:py-20">
              <h2 className="mx-auto mb-4 max-w-lg text-[28px] font-extrabold leading-tight tracking-tight text-white md:text-[34px]">
                جاهز توفر فلوسك؟
              </h2>
              <p className="mx-auto mb-8 max-w-md text-white/70">
                تصفح أحدث الكوبونات المتحقق منها الآن، أو تواصل معنا لو عندك أي استفسار.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/coupons" className="btn-primary btn-lg">تصفح الكوبونات</Link>
                <Link href="/contact" className="btn btn-lg border border-white/30 bg-transparent text-white hover:bg-white/10">تواصل معنا</Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

/* ------------------------------------------------------------ */

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("py-20", className)}>
      <div className="max-w-container mx-auto px-5">{children}</div>
    </section>
  );
}

function Eyebrow({
  icon: Icon, children, center, light,
}: { icon: LucideIcon; children: React.ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div className={cn("mb-3 flex items-center gap-2 text-xs font-bold", light ? "text-white/70" : "text-accent", center && "justify-center")}>
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </div>
  );
}

function HeroStat({
  icon: Icon, value, label, accent,
}: { icon: LucideIcon; value: string; label: string; accent?: boolean }) {
  return (
    <div className={cn(
      "flex h-full flex-col items-center justify-center gap-2 rounded-lg border bg-surface px-3 py-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
      accent ? "border-success/20 bg-success-soft/40" : "border-border"
    )}>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", accent ? "bg-success-soft text-success" : "bg-accent-soft text-accent")}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="text-xl font-extrabold leading-none text-primary">{value}</div>
      <div className="text-xs leading-snug text-ink-muted">{label}</div>
    </div>
  );
}

function MissionVisual({ verifiedCount }: { verifiedCount: number }) {
  return (
    <div className="relative mx-auto max-w-sm">
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-lg bg-gradient-to-br from-accent-soft to-transparent blur-2xl" />
      <div className="card rounded-lg p-8 text-center shadow-lg">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/15">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <div className="mb-1 text-4xl font-extrabold text-primary">{verifiedCount}</div>
        <p className="text-sm text-ink-muted">كوبون تم التحقق منه يدويًا من فريقنا حتى الآن</p>
      </div>
    </div>
  );
}

function ValueCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="card card-hover group h-full p-6">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/15 transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mb-2 font-bold text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
    </div>
  );
}

function StepCard({ index, title, description }: { index: number; title: string; description: string }) {
  return (
    <div className="relative flex flex-col items-center text-center md:items-start md:text-start">
      <span className="relative z-10 mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-extrabold text-white ring-4 ring-bg">
        {index}
      </span>
      <h3 className="mb-1.5 font-bold text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
    </div>
  );
}

function StatBlock({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <ScrollReveal delay={delay}>
      <div className="text-center">
        <div className="mb-1 text-4xl font-extrabold text-white md:text-5xl">{value}</div>
        <div className="text-sm text-white/70">{label}</div>
      </div>
    </ScrollReveal>
  );
}
