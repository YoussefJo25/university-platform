import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

const ARABIC_NUMERALS = ["١", "٢", "٣", "٤"];

export type JourneyStation = { title: string; subtitle: string };

export const DEFAULT_JOURNEY_STATIONS: JourneyStation[] = [
  { title: "الفرقة الأولى", subtitle: "أول خطوة في رحلتك" },
  { title: "الفرقة الثانية", subtitle: "تعمّق أكتر في التخصص" },
  { title: "الفرقة الثالثة", subtitle: "مهارات عملية وتطبيقية" },
  { title: "الفرقة الرابعة", subtitle: "استعداد لسوق العمل" },
];

// تفاعل الـ hover/tap هنا كله CSS بحت (group-hover/group-active) من غير
// أي JS state — بيشتغل صح على الماوس واللمس الاتنين من غير أي تفرقة
// بينهم، فمحتاجناش نعمل الكومبوننت ده client component أصلاً.
export default function StudentJourney({
  stations = DEFAULT_JOURNEY_STATIONS,
}: {
  stations?: JourneyStation[];
}) {
  return (
    <ScrollReveal>
      <section className="bg-panel px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-extrabold font-display text-ink sm:text-3xl">
            رحلة الطالب
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted sm:text-base">
            من أول فرقة لحد التخرج، كل مرحلة ليها المحتوى المناسب ليها
          </p>

          <div className="relative mt-14 flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div
              className="absolute top-6 right-6 left-6 hidden border-t-2 border-dashed border-gold/30 sm:block"
              aria-hidden="true"
            />
            {stations.map((station, index) => (
              <Link
                key={index}
                href="/universities"
                className="group relative z-10 flex flex-1 flex-col items-center gap-3 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-subtle bg-card text-lg font-bold text-ink transition-all group-hover:scale-110 group-hover:border-gold group-hover:text-gold-light group-active:scale-110 group-active:border-gold group-active:text-gold-light">
                  {ARABIC_NUMERALS[index]}
                </span>
                <div>
                  <p className="font-semibold text-ink">{station.title}</p>
                  <p className="mt-1 text-xs text-muted">{station.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
