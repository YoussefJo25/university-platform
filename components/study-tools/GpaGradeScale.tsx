import type { GradingScaleRow } from "./GpaCalculator";

// بقت ديناميكية بالكامل بعد ربط الحاسبة بنظام تقييم قابل للتخصيص لكل
// جامعة — مفيش جدول ثابت في الكود تاني، عشان مايبانش تناقض بين الجدول
// المعروض هنا والنطاقات الحقيقية اللي بتحسب بيها الحاسبة فعليًا.
export default function GpaGradeScale({
  scaleRows,
  universityName,
}: {
  scaleRows: GradingScaleRow[];
  universityName: string | null;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink">مرجع مقياس الدرجات{universityName ? ` — ${universityName}` : ""}</h2>

      {scaleRows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          لسه مفيش نظام تقييم متسجّل لهذه الجامعة، تواصل مع الإدارة.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {scaleRows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-gold/20 bg-panel p-3 text-center"
            >
              <p className="text-lg font-extrabold text-gold">{row.letter_grade}</p>
              <p className="mt-0.5 text-xs text-muted">
                {row.min_score}–{row.max_score}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{row.grade_point.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
