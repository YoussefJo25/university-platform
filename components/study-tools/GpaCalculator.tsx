"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GradeOption = "A" | "A-" | "B+" | "B" | "C" | "D" | "F";

// نظام نقاط قياسي شائع الاستخدام في الجامعات المصرية (من 4.0) — مذكور
// بالنص في البرومبت نفسه.
const GRADE_POINTS: Record<GradeOption, number> = {
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  C: 2.0,
  D: 1.0,
  F: 0.0,
};

const GRADE_LABELS: Record<GradeOption, string> = {
  A: "امتياز",
  "A-": "جيد جداً مرتفع",
  "B+": "جيد جداً",
  B: "جيد",
  C: "مقبول",
  D: "ضعيف",
  F: "راسب",
};

const GRADE_OPTIONS = Object.keys(GRADE_POINTS) as GradeOption[];

type GpaRow = {
  id: string;
  course_name: string;
  credit_hours: number;
  grade: GradeOption;
};

function createEmptyRow(): GpaRow {
  return { id: `temp-${crypto.randomUUID()}`, course_name: "", credit_hours: 3, grade: "B" };
}

export default function GpaCalculator() {
  const [rows, setRows] = useState<GpaRow[]>([createEmptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

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

      const { data } = await supabase
        .from("gpa_entries")
        .select("id, course_name, credit_hours, grade")
        .eq("user_id", user.id)
        .order("created_at");

      if (data && data.length > 0) {
        setRows(data as GpaRow[]);
      }
      setLoading(false);
    }

    load();
  }, []);

  const { gpa, totalHours } = useMemo(() => {
    let pointsSum = 0;
    let hoursSum = 0;
    for (const row of rows) {
      const hours = Number(row.credit_hours) || 0;
      if (hours <= 0) continue;
      pointsSum += GRADE_POINTS[row.grade] * hours;
      hoursSum += hours;
    }
    return { gpa: hoursSum > 0 ? pointsSum / hoursSum : 0, totalHours: hoursSum };
  }, [rows]);

  function updateRow(id: string, patch: Partial<GpaRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setSavedMessage(false);
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
    setSavedMessage(false);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
    setSavedMessage(false);
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
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center rounded-3xl border border-gold/25 bg-card px-6 py-10 text-center shadow-sm">
        <p className="text-sm text-muted">المعدل التراكمي التقديري</p>
        <p className="mt-2 text-6xl font-black text-gold tabular-nums">{gpa.toFixed(2)}</p>
        <p className="mt-2 text-xs text-muted">من 4.0 — إجمالي {totalHours} ساعة معتمدة</p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-subtle bg-card shadow-sm">
        <table className="w-full min-w-[560px] text-right text-sm">
          <thead>
            <tr className="border-b border-subtle text-xs text-muted">
              <th className="px-4 py-3 font-medium">اسم المادة</th>
              <th className="px-4 py-3 font-medium">الساعات المعتمدة</th>
              <th className="px-4 py-3 font-medium">الدرجة المتوقعة</th>
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
                    className="w-full rounded-lg border border-subtle bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold"
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
                    className="w-24 rounded-lg border border-subtle bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={row.grade}
                    onChange={(e) => updateRow(row.id, { grade: e.target.value as GradeOption })}
                    className="w-full rounded-lg border border-subtle bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  >
                    {GRADE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {GRADE_LABELS[option]} ({GRADE_POINTS[option].toFixed(1)})
                      </option>
                    ))}
                  </select>
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

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ الحسبة"}
        </button>
        {savedMessage && <span className="text-sm text-emerald-500">تم الحفظ ✓</span>}
      </div>
    </div>
  );
}
