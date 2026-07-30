"use client";

import { useEffect, useState } from "react";
import { Calculator, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GpaTargetCalculator from "./GpaTargetCalculator";
import GpaGradeScale from "./GpaGradeScale";
import GpaFaq from "./GpaFaq";

export type GradingScaleRow = {
  id: string;
  min_score: number;
  max_score: number;
  letter_grade: string;
  grade_point: number;
};

type UniversityOption = { id: number; name: string };

type GpaRow = {
  id: string;
  course_name: string;
  credit_hours: number | "";
  score: number | "";
  is_retake: boolean;
};

type Results = {
  termGpa: number;
  termHours: number;
  cumulativeGpa: number;
  cumulativeHours: number;
};

function createEmptyRow(): GpaRow {
  return {
    id: `temp-${crypto.randomUUID()}`,
    course_name: "",
    // الساعات المعتمدة مش موحّدة لكل المواد (1 لساينتفك ثينكينج، 2
    // للتكنيكال رايتنج، 3 لباقي المواد)، فمفيش رقم افتراضي — الطالب
    // بيدخلها بنفسه.
    credit_hours: "",
    score: "",
    is_retake: false,
  };
}

// إيجاد النطاق اللي بيغطي درجة معينة — الحد الأدنى شامل، الحد الأقصى
// غير شامل، إلا النطاق الأعلى (اللي وصوله لـ100) بيبقى شامل الطرفين
// عشان درجة 100 بالظبط تتغطى.
function findGradeForScore(score: number, scaleRows: GradingScaleRow[]): GradingScaleRow | null {
  return (
    scaleRows.find((row) => {
      if (score === 100 && row.max_score === 100) return true;
      return score >= row.min_score && score < row.max_score;
    }) ?? null
  );
}

const inputClasses =
  "w-full rounded-lg border border-subtle bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold";

export default function GpaCalculator() {
  const [priorHours, setPriorHours] = useState(0);
  const [priorCgpa, setPriorCgpa] = useState(0);
  const [rows, setRows] = useState<GpaRow[]>([createEmptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [results, setResults] = useState<Results | null>(null);

  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | "">("");
  const [scaleRows, setScaleRows] = useState<GradingScaleRow[]>([]);

  // تحميل بيانات المستخدم المحفوظة (السجل السابق + المواد) وقائمة
  // الجامعات مرة واحدة بس عند فتح الصفحة.
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: universityRows } = await supabase
        .from("universities")
        .select("id, name")
        .order("order_index");
      setUniversities((universityRows ?? []) as UniversityOption[]);

      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: profileRow }, { data: entryRows }, { data: studentProfile }] = await Promise.all([
        supabase
          .from("gpa_profile")
          .select("prior_attempted_hours, prior_cgpa")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("gpa_entries")
          .select("id, course_name, credit_hours, score, is_retake")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase.from("profiles").select("university_id").eq("id", user.id).maybeSingle(),
      ]);

      if (profileRow) {
        setPriorHours(profileRow.prior_attempted_hours);
        setPriorCgpa(profileRow.prior_cgpa);
      }

      if (entryRows && entryRows.length > 0) {
        setRows(
          entryRows.map((row) => ({
            id: row.id,
            course_name: row.course_name,
            credit_hours: row.credit_hours,
            score: row.score ?? "",
            is_retake: row.is_retake,
          }))
        );
      }

      // الجامعة الافتراضية: جامعة الطالب المسجّلة في بروفايله لو موجودة،
      // وإلا أول جامعة في القائمة (حالة "طالب بدون جامعة محددة").
      const defaultUniversityId = studentProfile?.university_id ?? universityRows?.[0]?.id ?? "";
      setSelectedUniversityId(defaultUniversityId);

      setLoading(false);
    }

    load();
  }, []);

  // تحميل نظام تقييم الجامعة المختارة كل ما الاختيار يتغيّر.
  useEffect(() => {
    if (!selectedUniversityId) return;

    async function loadScale() {
      const supabase = createClient();
      const { data } = await supabase
        .from("grading_scales")
        .select("id, min_score, max_score, letter_grade, grade_point")
        .eq("university_id", selectedUniversityId)
        .order("display_order");
      setScaleRows((data ?? []) as GradingScaleRow[]);
    }

    loadScale();
  }, [selectedUniversityId]);

  function clearResults() {
    setResults(null);
    setSavedMessage(false);
  }

  function updateRow(id: string, patch: Partial<GpaRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    clearResults();
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
    clearResults();
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
    clearResults();
  }

  function handleCalculate() {
    let termPoints = 0;
    let termHours = 0;
    // ساعات المواد "المعادة" منضافش هنا — مفروض محسوبة أصلاً جوا
    // "إجمالي الساعات المقطوعة سابقاً"، فمنسيبهاش تتضاعف في الإجمالي
    // التراكمي. درجتها الجديدة برضو بتدخل في نقاط الجودة زي أي مادة عادية.
    let newCumulativeHours = 0;

    for (const row of rows) {
      const hours = Number(row.credit_hours) || 0;
      if (hours <= 0 || row.score === "") continue;

      const matched = findGradeForScore(Number(row.score), scaleRows);
      if (!matched) continue; // درجة برّه كل النطاقات — مش هتدخل في الحساب

      termPoints += matched.grade_point * hours;
      termHours += hours;
      if (!row.is_retake) {
        newCumulativeHours += hours;
      }
    }

    const termGpa = termHours > 0 ? termPoints / termHours : 0;

    const priorPoints = priorHours > 0 ? priorCgpa * priorHours : 0;
    const cumulativeHours = priorHours + newCumulativeHours;
    const cumulativePoints = priorPoints + termPoints;
    const cumulativeGpa = cumulativeHours > 0 ? cumulativePoints / cumulativeHours : termGpa;

    setResults({ termGpa, termHours, cumulativeGpa, cumulativeHours });
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const validRows = rows.filter((row) => row.course_name.trim() && Number(row.credit_hours) > 0);

    await supabase.from("gpa_profile").upsert(
      {
        user_id: user.id,
        prior_attempted_hours: priorHours,
        prior_cgpa: priorCgpa,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // استبدال كامل بدل مقارنة صف بصف: بنمسح صفوف المستخدم القديمة كلها
    // ونضيف الحالة الحالية من جديد — الحاسبة دي "حسبة واحدة" بيرجعلها
    // المستخدم، مش سجل تاريخي لعدة حسبات، فمفيش داعي لمنطق diff أعقد.
    await supabase.from("gpa_entries").delete().eq("user_id", user.id);

    if (validRows.length > 0) {
      await supabase.from("gpa_entries").insert(
        validRows.map((row) => {
          const scoreValue = row.score === "" ? null : Number(row.score);
          const matched = scoreValue !== null ? findGradeForScore(scoreValue, scaleRows) : null;
          return {
            user_id: user.id,
            course_name: row.course_name.trim(),
            credit_hours: Number(row.credit_hours),
            score: scoreValue,
            grade: matched?.letter_grade ?? "—",
            is_retake: row.is_retake,
          };
        })
      );
    }

    setSaving(false);
    setSavedMessage(true);
    window.setTimeout(() => setSavedMessage(false), 3000);
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted">جارٍ التحميل...</p>;
  }

  const selectedUniversityName =
    universities.find((u) => u.id === selectedUniversityId)?.name ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        <label className="mb-1.5 block text-sm font-medium text-ink">
          نظام التقييم المستخدم (جامعتك)
        </label>
        <select
          value={selectedUniversityId}
          onChange={(e) => setSelectedUniversityId(Number(e.target.value))}
          className={inputClasses}
        >
          {universities.length === 0 && <option value="">جارٍ التحميل...</option>}
          {universities.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">السجل الأكاديمي السابق</h2>
        <p className="mt-1 text-sm text-muted">
          وضعك قبل الفصل الحالي، عشان ندمجه مع نتيجة الفصل ده في معدل تراكمي واحد
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              إجمالي الساعات المقطوعة سابقاً
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={priorHours}
              onChange={(e) => {
                setPriorHours(Math.max(0, Number(e.target.value)));
                clearResults();
              }}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">المعدل التراكمي السابق</label>
            <input
              type="number"
              min={0}
              max={4}
              step={0.01}
              value={priorCgpa}
              onChange={(e) => {
                setPriorCgpa(Math.max(0, Math.min(4, Number(e.target.value))));
                clearResults();
              }}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-subtle bg-card shadow-sm">
        <table className="w-full min-w-[680px] text-right text-sm">
          <thead>
            <tr className="border-b border-subtle text-xs text-muted">
              <th className="px-4 py-3 font-medium">اسم المادة</th>
              <th className="px-4 py-3 font-medium">الساعات المعتمدة</th>
              <th className="px-4 py-3 font-medium">الدرجة من 100</th>
              <th className="px-4 py-3 font-medium">معادة</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const scoreValue = row.score === "" ? null : Number(row.score);
              const matched = scoreValue !== null ? findGradeForScore(scoreValue, scaleRows) : null;
              const isOutOfRange = scoreValue !== null && !matched && scaleRows.length > 0;

              return (
                <tr key={row.id} className="border-b border-subtle last:border-0">
                  <td className="px-4 py-2 align-top">
                    <input
                      value={row.course_name}
                      onChange={(e) => updateRow(row.id, { course_name: e.target.value })}
                      placeholder="اسم المادة"
                      className={inputClasses}
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.credit_hours}
                      onChange={(e) =>
                        updateRow(row.id, {
                          credit_hours: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)),
                        })
                      }
                      placeholder="مثال: 3"
                      className={`w-24 ${inputClasses}`}
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.score}
                      onChange={(e) =>
                        updateRow(row.id, {
                          score: e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))),
                        })
                      }
                      placeholder="مثال: 78"
                      className={`w-24 ${inputClasses}`}
                    />
                    {matched && (
                      <p className="mt-1 text-xs text-emerald-500">
                        {scoreValue} → {matched.letter_grade} ({matched.grade_point.toFixed(2)})
                      </p>
                    )}
                    {isOutOfRange && (
                      <p className="mt-1 text-xs text-red-600">
                        الدرجة دي مش متغطاة في نظام التقييم، تواصل مع الإدارة
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center align-top">
                    <RetakeToggle
                      checked={row.is_retake}
                      onChange={(checked) => updateRow(row.id, { is_retake: checked })}
                    />
                  </td>
                  <td className="px-2 py-2 text-center align-top">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="text-muted transition-colors hover:text-red-600 disabled:opacity-30"
                      aria-label="حذف المادة"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-4">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 rounded-full border border-gold/40 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-light"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة مادة
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCalculate}
          className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105"
        >
          <Calculator className="h-4 w-4" aria-hidden="true" />
          احسب النتائج 🧮
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-light disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ الحسبة"}
        </button>
        {savedMessage && <span className="text-sm text-emerald-500">تم الحفظ ✓</span>}
      </div>

      {results && (
        <div className="grid grid-cols-1 divide-y divide-subtle overflow-hidden rounded-2xl border border-gold/25 bg-card text-center shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
          <div className="px-4 py-6">
            <p className="text-sm text-muted">إجمالي الساعات الكلية</p>
            <p className="mt-2 text-4xl font-black text-ink tabular-nums">
              {results.cumulativeHours}
            </p>
          </div>
          <div className="px-4 py-6">
            <p className="text-sm text-muted">المعدل التراكمي الكلي (CGPA)</p>
            <p className="mt-2 text-4xl font-black text-gold tabular-nums">
              {results.cumulativeGpa.toFixed(2)}
            </p>
          </div>
          <div className="px-4 py-6">
            <p className="text-sm text-muted">معدل الفصل الدراسي (GPA)</p>
            <p className="mt-2 text-4xl font-black text-ink tabular-nums">
              {results.termGpa.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <GpaTargetCalculator
        currentCgpa={results?.cumulativeGpa ?? null}
        currentHours={results?.cumulativeHours ?? null}
      />

      <GpaGradeScale scaleRows={scaleRows} universityName={selectedUniversityName} />

      <GpaFaq />
    </div>
  );
}

function RetakeToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="معادة"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-gold" : "bg-subtle"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
