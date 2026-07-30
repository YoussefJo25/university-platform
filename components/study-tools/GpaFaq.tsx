"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "إيه الفرق بين GPA وCGPA؟",
    answer:
      "GPA هو معدلك في الفصل الحالي بس (المواد اللي داخلها دلوقتي)، أما CGPA فهو معدلك التراكمي من أول ما دخلت الكلية لحد دلوقتي — بيدمج كل الفصول اللي فاتت مع الفصل الحالي في رقم واحد.",
  },
  {
    question: "هل الحاسبة بتدعم المواد المعادة؟",
    answer:
      "أيوة — فعّل خيار \"معادة\" جنب أي مادة عايز تدمج درجتها الجديدة في معدلك التراكمي من غير ما ساعاتها تتحسب مرتين في إجمالي ساعاتك.",
  },
  {
    question: "إزاي أحسب المعدل المطلوب لهدف معين؟",
    answer:
      "استخدم قسم \"حاسبة المعدل المستهدف\" تحت — اكتب المعدل اللي عايز توصله وعدد ساعات الفصل الجاي، وهي هتقولك المعدل اللي لازم تحققه في الفصل ده بالظبط عشان توصل لهدفك.",
  },
  {
    question: "هل بياناتي محفوظة وآمنة؟",
    answer: "أيوة، لو مسجّل دخول، حسبتك بتتحفظ في حسابك بس، ومحدش تاني يقدر يشوفها.",
  },
  {
    question: "الأرقام اللي بتطلع دي رسمية من الكلية؟",
    answer:
      "لا، الحاسبة دي أداة تقديرية بس لمساعدتك تتابع مستواك أول بأول، مش بديل عن الإفادة أو الشهادة الرسمية من كليتك.",
  },
];

export default function GpaFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink">عن الحاسبة</h2>
      <p className="mt-2 text-sm leading-7 text-muted">
        حاسبة تقدير المعدل من بوصلة أداة بسيطة تساعدك تتابع معدلك الفصلي (GPA) ومعدلك
        التراكمي (CGPA) وانت لسه بتخطط لدرجاتك، قبل ما تتأكد منها رسميًا من كليتك.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-gold">أسئلة شائعة</h3>
      <div className="mt-3 flex flex-col divide-y divide-subtle">
        {FAQ_ITEMS.map((item, index) => (
          <div key={item.question} className="py-3">
            <button
              type="button"
              onClick={() => setOpenIndex((prev) => (prev === index ? null : index))}
              aria-expanded={openIndex === index}
              className="flex w-full items-center justify-between gap-3 text-right text-sm font-semibold text-ink"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  openIndex === index ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {openIndex === index && (
              <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
