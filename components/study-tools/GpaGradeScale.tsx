const GRADE_SCALE = [
  { grade: "A", label: "امتياز", points: "4.00" },
  { grade: "A-", label: "جيد جداً مرتفع", points: "3.70" },
  { grade: "B+", label: "جيد جداً", points: "3.30" },
  { grade: "B", label: "جيد", points: "3.00" },
  { grade: "C+", label: "مقبول مرتفع", points: "2.30" },
  { grade: "C", label: "مقبول", points: "2.00" },
  { grade: "C-", label: "مقبول منخفض", points: "1.70" },
  { grade: "D+", label: "ضعيف مرتفع", points: "1.30" },
  { grade: "D", label: "ضعيف", points: "1.00" },
  { grade: "F", label: "راسب", points: "0.00" },
];

// شبكة 7 أعمدة على الشاشات الواسعة عشان الـ10 كروت يتوزّعوا صف أول (7)
// وصف تاني (3) بالظبط زي ما هو متوقع، وتتقلّص تلقائيًا على الشاشات
// الأصغر.
export default function GpaGradeScale() {
  return (
    <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink">مرجع مقياس الدرجات</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {GRADE_SCALE.map((item) => (
          <div
            key={item.grade}
            className="rounded-xl border border-gold/20 bg-panel p-3 text-center"
          >
            <p className="text-lg font-extrabold text-gold">{item.grade}</p>
            <p className="mt-0.5 text-xs text-muted">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{item.points}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
