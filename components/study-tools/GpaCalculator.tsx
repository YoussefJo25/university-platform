"use client";

import { useEffect, useState } from "react";
import { Calculator, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GpaTargetCalculator from "./GpaTargetCalculator";
import GpaGradeScale from "./GpaGradeScale";
import GpaFaq from "./GpaFaq";

type GradeOption = "A" | "A-" | "B+" | "B" | "C+" | "C" | "C-" | "D+" | "D" | "F";

// نظام نقاط قياسي شائع الاستخدام في الجامعات المصرية (من 4.0)، بمقياس
// 10 درجات كامل.
const GRADE_POINTS: Record<GradeOption, number> = {
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  F: 0.0,
};

const GRADE_LABELS: Record<GradeOption, string> = {
  A: "امتياز",
  "A-": "جيد جداً مرتفع",
  "B+": "جيد جداً",
  B: "جيد",
  "C+": "مقبول مرتفع",
  C: "مقبول",
  "C-": "مقبول منخفض",
  "D+": "ضعيف مرتفع",
  D: "ضعيف",
  F: "راسب",
};

const GRADE_OPTIONS = Object.keys(GRADE_POINTS) as GradeOption[];

type GpaRow = {
  id: string;
  course_name: string;
  credit_hours: number;
  grade: GradeOption;
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
    credit_hours: 3,
    grade: "B",
    is_retake: false,
  };
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

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: profileRow }, { data: entryRows }] = await Promise.all([
        supabase
          .from("gpa_profile")
          .select("prior_attempted_hours, prior_cgpa")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("gpa_entries")
          .select("id, course_name, credit_hours, grade, is_retake")
          .eq("user_id", user.id)
          .order("created_at"),
      ]);

      if (profileRow) {
        setPriorHours(profileRow.prior_attempted_hours);
        setPriorCgpa(profileRow.prior_cgpa);
      }

      if (entryRows && entryRows.length > 0) {
        setRows(entryRows as GpaRow[]);
      }

      setLoading(false);
    }

    load();
  }, []);

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
      if (hours <= 0) continue;
      const points = GRADE_POINTS[row.grade];
      termPoints += points * hours;
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

    const validRows = rows.filter((row) => row.course_name.trim() && row.credit_hours > 0);

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
        validRows.map((row) => ({
          user_id: user.id,
          course_name: row.course_name.trim(),
          credit_hours: row.credit_hours,
          grade: row.grade,
          is_retake: row.is_retake,
        }))
      );
    }

    setSaving(false);
    setSavedMessage(true);
    window.setTimeout(() => setSavedMessage(false), 3000);
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted">جارٍ التحميل...</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
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
              <th className="px-4 py-3 font-medium">الدرجة المتوقعة</th>
              <th className="px-4 py-3 font-medium">معادة</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-subtle last:border-0">
                <td className="px-4 py-2">
                  <input
                    value={row.course_name}
                    onChange={(e) => updateRow(row.id, { course_name: e.target.value })}
                    placeholder="اسم المادة"
                    className={inputClasses}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={row.credit_hours}
                    onChange={(e) =>
                      updateRow(row.id, { credit_hours: Math.max(0, Number(e.target.value)) })
                    }
                    className={`w-24 ${inputClasses}`}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={row.grade}
                    onChange={(e) => updateRow(row.id, { grade: e.target.value as GradeOption })}
                    className={inputClasses}
                  >
                    {GRADE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {GRADE_LABELS[option]} ({GRADE_POINTS[option].toFixed(1)})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <RetakeToggle
                    checked={row.is_retake}
                    onChange={(checked) => updateRow(row.id, { is_retake: checked })}
                  />
                </td>
                <td className="px-2 py-2 text-center">
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
            ))}
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

      <GpaGradeScale />

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
