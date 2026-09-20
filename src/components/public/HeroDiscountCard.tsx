import { Copy, Percent } from "lucide-react";

/**
 * الرسمة الزخرفية لهيرو الصفحة الرئيسية — إعادة تصميم كاملة (v2) بعد أن
 * كان التصميم الأول (v1: كيس تسوّق + علبة هدية + شارة % عائمة) قد وُصف
 * بأنه "شكل AI عام ومكرر" — نفس تركيبة الرسوم الجاهزة المستخدمة بمعظم
 * صفحات SaaS، بلا أي صلة بمنتجنا الفعلي.
 *
 * الفكرة هنا مختلفة جذريًا: بدل رسوم تجريدية (هدية/كيس) لا علاقة لها
 * بالكوبونات، الرسمة الآن هي "تذكرة كوبون" حقيقية — نفس اللغة البصرية
 * المستخدمة فعليًا ببطاقة الكوبون بالموقع (CouponCard/CouponCode):
 * خط تعرّج متقطّع بنتوءين دائريين (نفس .coupon-perforation)، كود بخط
 * font-code، وختم دائري بلون accent كرمز "التحقق/الثقة" (نفس مفهوم
 * badge "تم التحقق منه" الموجود فعليًا بالهيرو النصي) بدل شارة % عشوائية.
 * علامة "%" ضخمة شبه-شفافة خلف التركيبة تعطي حجمًا وجرأة طباعية بدل
 * الاعتماد على أيقونات صغيرة متناثرة.
 */
export function HeroDiscountCard({ cardLabel }: { cardLabel: string }) {
  return (
    <div className="relative mx-auto h-[250px] w-[300px] sm:h-[280px] sm:w-[340px] lg:h-[300px] lg:w-[380px]">
      {/* علامة % ضخمة شبه شفافة خلف كل التركيبة — عنصر طباعي بحجم جريء
          بدل حشد أيقونات صغيرة، ويكرّر نفس شكل الختم الصغير بالبطاقة. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 end-0 select-none text-[170px] font-black leading-none text-accent/[0.07] sm:text-[210px] lg:text-[230px]"
      >
        %
      </span>

      {/* تذكرة خلفية باهتة — نفس شكل التذكرة الأمامية بزاوية معاكسة أوسع،
          توحي بوجود رزمة تذاكر/كوبونات حقيقية خلفها، لا مجرد عنصر واحد معلّق. */}
      <div className="absolute inset-x-8 top-8 h-[170px] rotate-[-9deg] rounded-2xl bg-surface/80 ring-1 ring-border sm:h-[190px] lg:h-[205px]" />

      {/* التذكرة الأمامية — البطاقة الرئيسية */}
      <div className="absolute inset-0 flex rotate-[3deg] flex-col overflow-hidden rounded-2xl bg-surface shadow-lg ring-1 ring-border">
        {/* شريط علوي كحلي — هوية الموقع، بدون أي رسم إضافي */}
        <div className="flex items-center justify-between bg-primary px-5 py-2">
          <span className="text-[11px] font-bold tracking-wide text-white">كوبون نور</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/40 text-[8px] font-bold text-white">٪</span>
        </div>

        {/* الختم الدائري — رمز التحقق/الثقة الفعلي بدل أيقونة هدية */}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 pt-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-md ring-4 ring-accent-soft sm:h-16 sm:w-16">
            <Percent className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={3} />
          </div>
          <p className="text-center text-sm font-extrabold leading-tight text-primary sm:text-base">
            {cardLabel}
          </p>
        </div>

        {/* خط التعرّج المتقطّع مع نتوءين دائريين — نفس منطق .coupon-perforation
            الحقيقي بـ globals.css، بس مُعاد هنا يدويًا لأن الكلاس مبني لعرض
            الحاوية بالكارت الحقيقي (سالب -18px) وهذا عرض مختلف. */}
        <div className="relative mx-3 border-t-[1.5px] border-dashed border-border-strong">
          <span aria-hidden="true" className="absolute -top-[7px] -start-[7px] h-[14px] w-[14px] rounded-full bg-bg" />
          <span aria-hidden="true" className="absolute -top-[7px] -end-[7px] h-[14px] w-[14px] rounded-full bg-bg" />
        </div>

        {/* منطقة الكود — نفس بنية الكود الحقيقية بالموقع (خط font-code + زر نسخ) */}
        <div className="flex flex-col items-center gap-1.5 bg-surface-alt px-4 py-3">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-faint">كود الخصم</span>
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface px-3.5 py-1">
            <span dir="ltr" className="font-code text-sm font-bold tracking-[0.08em] text-primary sm:text-base">
              NOOR30
            </span>
            <Copy className="h-3.5 w-3.5 text-ink-faint" />
          </div>
        </div>
      </div>
    </div>
  );
}
