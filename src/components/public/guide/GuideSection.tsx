/** غلاف قسم موحّد لكل H2 بالدليل — id للـ anchor (يطابق GuideTOC)،
 *  مسافة ثابتة، ومحاذاة scroll-margin عشان العنوان ما ينلصق بشريط
 *  الهيدر اللاصق لما نوصله عبر رابط من جدول المحتويات. */
export function GuideSection({
  id, title, children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-extrabold text-primary md:text-[22px]">{title}</h2>
      <div className="space-y-3 text-[15px] leading-[1.85] text-ink/90">{children}</div>
    </section>
  );
}
