"use client";

import { useState } from "react";
import { Target } from "lucide-react";

const inputClasses =
  "w-full rounded-lg border border-subtle bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold";

export default function GpaTargetCalculator({
  currentCgpa,
  currentHours,
}: {
  currentCgpa: number | null;
  currentHours: number | null;
}) {
  const [targetCgpa, setTargetCgpa] = useState(3.5);
  const [nextTermHours, setNextTermHours] = useState(15);
  const [requiredGpa, setRequiredGpa] = useState<number | null>(null);

  const hasBaseline = currentCgpa !== null && currentHours !== null;

  function handleCalculate() {
    if (!hasBaseline || nextTermHours <= 0) {
      setRequiredGpa(null);
      return;
    }
    const totalHoursAfter = (currentHours as number) + nextTermHours;
    const required =
      (targetCgpa * totalHoursAfter - (currentHours as number) * (currentCgpa as number)) / nextTermHours;
    setRequiredGpa(required);
  }

  return (
    <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
        <Target className="h-5 w-5 text-gold" aria-hidden="true" />
        حاسبة المعدل المستهدف
      </h2>
      <p className="mt-1 text-sm text-muted">
        اعرف المعدل اللي لازم تحققه الفصل الجاي عشان توصل لهدفك
      </p>

      {!hasBaseline ? (
        <p className="mt-6 rounded-xl bg-panel px-4 py-3 text-sm text-muted">
          احسب نتائجك في الحاسبة الأساسية فوق الأول (زرار &quot;احسب النتائج&quot;) عشان الأداة
          دي تعرف نقطة انطلاقك الحالية.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                المعدل التراكمي المستهدف
              </label>
              <input
                type="number"
                min={0}
                max={4}
                step={0.01}
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(Number(e.target.value))}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                عدد ساعات الفصل القادم
              </label>
              <input
                type="number"
                min={1}
                value={nextTermHours}
                onChange={(e) => setNextTermHours(Math.max(1, Number(e.target.value)))}
                className={inputClasses}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCalculate}
            className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105"
          >
            احسب المعدل المطلوب 🎯
          </button>

          {requiredGpa !== null && (
            <div className="mt-5 rounded-xl bg-panel p-4 text-center">
              {requiredGpa > 4.0 ? (
                <p className="text-sm text-red-600">
                  الهدف ده مش قابل للتحقيق في {nextTermHours} ساعة بس (المطلوب أعلى من 4.0) —
                  محتاج فصول أكتر.
                </p>
              ) : requiredGpa < 0 ? (
                <p className="text-sm text-emerald-500">مبروك، معدلك الحالي أصلاً أعلى من هدفك 🎉</p>
              ) : (
                <>
                  <p className="text-sm text-muted">المعدل المطلوب في الفصل القادم</p>
                  <p className="mt-1 text-3xl font-black text-gold tabular-nums">
                    {Math.max(0, requiredGpa).toFixed(2)}
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
