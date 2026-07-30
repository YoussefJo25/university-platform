"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Code2 } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import type { CoursePreview } from "./RealContentShowcase";

type TrackKey = "university" | "programming";

const TRACK_CONTENT: Record<
  TrackKey,
  {
    tabLabel: string;
    title: string;
    description: string;
    bullets: string[];
    href: string;
    ctaLabel: string;
    icon: typeof BookOpen;
  }
> = {
  university: {
    tabLabel: "مسار الجامعات",
    title: "مسار الجامعات",
    description:
      "مرتبط بمنهج كليتك الرسمي بالظبط، منظّم بالجامعة والفرقة والترم والمادة، عشان متضيّعش وقت في البحث عن مصدر المحاضرة الصح.",
    bullets: [
      "محتوى مطابق لمنهج كليتك بالظبط",
      "منظّم حسب الجامعة والفرقة والترم",
      "فيديوهات وكتب في مكان واحد لكل مادة",
    ],
    href: "/universities",
    ctaLabel: "تصفح مسار الجامعات",
    icon: BookOpen,
  },
  programming: {
    tabLabel: "مسار تعلم البرمجة",
    title: "مسار تعلم البرمجة",
    description:
      "مستقل تمامًا عن أي جامعة أو منهج، مبني على تعلّم برمجة عملية حقيقية تفيدك في سوق الشغل، مقسّم بخطوات واضحة من الصفر لكل تخصص.",
    bullets: [
      "غير مرتبط بجامعة أو منهج معين",
      "خطوات تدريجية واضحة لكل تخصص",
      "محتوى عملي يجهزك لسوق الشغل",
    ],
    href: "/learning-path",
    ctaLabel: "ابدأ مسار البرمجة",
    icon: Code2,
  },
};

export default function TracksSection({
  universityPreviews,
  programmingPreviews,
}: {
  universityPreviews: CoursePreview[];
  programmingPreviews: CoursePreview[];
}) {
  const [activeTab, setActiveTab] = useState<TrackKey>("university");
  const content = TRACK_CONTENT[activeTab];
  const previews = activeTab === "university" ? universityPreviews : programmingPreviews;
  const Icon = content.icon;

  return (
    <ScrollReveal>
      <section className="bg-canvas px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
              مسارين، هدف واحد
            </h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              أيًّا كان اللي بتدوّر عليه، هتلاقيه منظّم وسهل الوصول
            </p>
          </div>

          <div
            role="tablist"
            className="mx-auto mt-8 flex max-w-[460px] rounded-full border border-subtle bg-card p-1"
          >
            {(Object.keys(TRACK_CONTENT) as TrackKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === key ? "bg-gold text-gold-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {TRACK_CONTENT[key].tabLabel}
              </button>
            ))}
          </div>

          <div key={activeTab} role="tabpanel" className="track-panel-enter mt-10 grid gap-8 sm:grid-cols-2">
            <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
              {previews.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">لسه مفيش محتوى مضاف في القسم ده</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {previews.map((course) => (
                    <li key={course.id} className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card-alt text-gold-light">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{course.name}</p>
                        {course.context_label && (
                          <p className="mt-0.5 text-xs text-muted">{course.context_label}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-gold-light">{content.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{content.description}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {content.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-ink">
                    <span className="mt-0.5 text-xs text-gold">◆</span>
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={content.href}
                className="mt-6 inline-flex items-center justify-center rounded-full border border-gold/40 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-light"
              >
                {content.ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
