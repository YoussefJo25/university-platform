import ScrollReveal from "@/components/ScrollReveal";

export default function MissionSection() {
  return (
    <ScrollReveal>
      <section className="bg-panel px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-wide text-gold">ليه بوصلة؟</p>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-ink sm:text-3xl">
            مش بس منصة مذاكرة، دي <span className="text-gold-light">بوصلتك</span> وسط زحمة الكلية
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
            بتدخل الكلية تلاقي المحاضرات متفرّقة بين فيديوهات ومواقع وملخصات كل واحد في مكان، وبتضيع وقت
            في البحث بدل المذاكرة. بوصلة بتجمعلك كل ده في مكان واحد منظّم بالسنة والترم والمادة، عشان
            تركيزك يفضل في المذاكرة مش في الدوران.
          </p>
        </div>
      </section>
    </ScrollReveal>
  );
}
