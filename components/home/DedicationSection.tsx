import ScrollReveal from "@/components/ScrollReveal";

// قسم إهداء منفصل ومتوقّر — حدود علوية/سفلية رفيعة بالذهبي الشفاف بس،
// من غير أي حركة أو توهج. النص هنا هو نفسه بيانات عضو القيادة بـ
// role_key = "dedication" (نفس المصدر المعروض في قسم "القيادة والفريق")
// عشان يفضل مصدر واحد للنص، قابل للتعديل من نفس تاب "القيادة" في لوحة
// التحكم الموجود بالفعل — مش حقل site_settings جديد مكرر لنفس المعنى.
export default function DedicationSection({
  name,
  title,
  bio,
}: {
  name: string;
  title: string | null;
  bio: string | null;
}) {
  if (!bio) return null;

  return (
    <ScrollReveal>
      <section className="border-y border-gold/20 bg-canvas px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-base leading-8 text-ink sm:text-lg">{bio}</p>
          <p className="mt-4 text-sm font-semibold text-gold-light">
            {name}
            {title ? ` — ${title}` : ""}
          </p>
        </div>
      </section>
    </ScrollReveal>
  );
}
