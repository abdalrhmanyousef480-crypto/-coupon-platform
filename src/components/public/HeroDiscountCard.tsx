import { Percent } from "lucide-react";

/**
 * تصميم زخرفي بحت لهيرو الصفحة الرئيسية — بطاقة "نوتة" مائلة فوق منصّة
 * أسطوانية، مع كيس تسوّق وعلبة هدية وشارة نسبة مئوية صغيرة، كلها بنفس
 * تدرّجات الوردي/الأبيض من tailwind.config.ts (accent/accent-soft/surface).
 * المواضع كلها فعلية (left/right) بقصد بغض النظر عن اتجاه RTL — نفس منطق
 * استثناء كود الكوبون بـ CLAUDE.md، لأنها عناصر رسم ثابتة مو نص متدفق.
 */
export function HeroDiscountCard({ cardLabel }: { cardLabel: string }) {
  return (
    <div className="relative mx-auto h-[280px] w-[300px] sm:h-[320px] sm:w-[340px] lg:h-[360px] lg:w-[380px]">
      {/* شارة % صغيرة عائمة أعلى اليمين — تطابق العنصر الصغير المائل بالمرجع */}
      <div className="absolute right-2 top-0 flex h-9 w-9 rotate-[18deg] items-center justify-center rounded-lg bg-surface shadow-md ring-1 ring-inset ring-border sm:h-10 sm:w-10">
        <Percent className="h-4 w-4 text-accent" strokeWidth={3} />
      </div>

      {/* كيس التسوّق */}
      <div className="absolute right-16 top-6 h-24 w-20 rotate-[-4deg] sm:right-20 sm:top-7 sm:h-28 sm:w-24 lg:right-24 lg:top-8 lg:h-32 lg:w-28">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-5 w-9 -translate-x-1/2 rounded-t-full border-4 border-b-0 border-accent-soft sm:h-6 sm:w-10"
        />
        <div className="absolute inset-x-0 bottom-0 top-3 rounded-lg bg-gradient-to-b from-accent-soft to-[#f4c7bd] shadow-sm" />
      </div>

      {/* علبة الهدية */}
      <div className="absolute right-0 top-24 h-16 w-20 sm:top-28 sm:h-[72px] sm:w-24 lg:top-32 lg:h-20 lg:w-28">
        <div className="absolute inset-0 rounded-md bg-gradient-to-b from-[#f4c7bd] to-accent-soft shadow-sm" />
        <div className="absolute inset-y-0 left-1/2 w-2.5 -translate-x-1/2 bg-surface/70" />
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 bg-surface/70" />
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-[130%] -translate-y-1/2 rotate-[-25deg] rounded-full bg-accent-soft" />
        <span className="absolute left-1/2 top-0 h-3 w-3 translate-x-[30%] -translate-y-1/2 rotate-[25deg] rounded-full bg-accent-soft" />
      </div>

      {/* منصّة أسطوانية أسفل التركيبة */}
      <div className="absolute bottom-0 left-4 h-14 w-56 sm:h-16 sm:w-64 lg:h-[70px] lg:w-72">
        <div className="absolute inset-x-0 bottom-0 top-3 rounded-b-[100px] bg-gradient-to-b from-accent-soft to-[#f0bcb1]" />
        <div className="absolute inset-x-0 top-0 h-6 rounded-full bg-gradient-to-b from-surface to-accent-soft sm:h-7" />
      </div>

      {/* البطاقة الرئيسية — نفس بنية دفتر الحلقات، بدون سهم/تعليق نصي بعد الآن */}
      <div className="absolute bottom-10 right-2 h-[150px] w-[220px] rotate-[10deg] rounded-lg bg-surface shadow-lg sm:bottom-11 sm:h-[168px] sm:w-[248px] lg:bottom-12 lg:h-[186px] lg:w-[274px]">
        <div className="absolute inset-y-3 left-2 flex w-6 flex-col items-center justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full bg-accent-soft ring-1 ring-inset ring-border"
            />
          ))}
        </div>
        <div className="absolute inset-y-3 left-10 right-3 flex items-center justify-center rounded-md border border-border">
          <p className="text-center text-lg font-extrabold leading-tight text-primary sm:text-xl">
            {cardLabel}
          </p>
        </div>
        <div className="absolute -bottom-4 -right-4 flex h-14 w-14 rotate-[8deg] items-center justify-center rounded-xl bg-accent shadow-md sm:h-16 sm:w-16">
          <Percent className="h-6 w-6 text-white sm:h-7 sm:w-7" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}
