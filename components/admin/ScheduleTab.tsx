"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DAYS, PERIODS, GROUP_NUMBERS, dayLabel, periodLabel } from "@/lib/scheduleConstants";

type University = { id: number; name: string };
type Year = { id: number; name: string; university_id: number | null };

type ScheduleSlotRow = {
  id: string;
  day_of_week: number;
  period_number: number;
  group_number: number;
  course_name: string;
  location: string | null;
  instructor_name: string | null;
};

const EMPTY_FORM = {
  day_of_week: 0,
  period_number: 1,
  group_number: 1,
  course_name: "",
  location: "",
  instructor_name: "",
};

export default function ScheduleTab({
  universities,
  years,
  supabase,
}: {
  universities: University[];
  years: Year[];
  supabase: SupabaseClient;
}) {
  const [universityId, setUniversityId] = useState<number | null>(universities[0]?.id ?? null);
  const yearsForUniversity = years.filter((y) => y.university_id === universityId);
  const [yearId, setYearId] = useState<number | null>(yearsForUniversity[0]?.id ?? null);

  const [slots, setSlots] = useState<ScheduleSlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    if (!universityId || !yearId) {
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("general_schedule_slots")
      .select("id, day_of_week, period_number, group_number, course_name, location, instructor_name")
      .eq("university_id", universityId)
      .eq("year_id", yearId);
    setSlots((data ?? []) as ScheduleSlotRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universityId, yearId]);

  function handleUniversityChange(newId: number) {
    setUniversityId(newId);
    const nextYears = years.filter((y) => y.university_id === newId);
    setYearId(nextYears[0]?.id ?? null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function startEdit(slot: ScheduleSlotRow) {
    setEditingId(slot.id);
    setForm({
      day_of_week: slot.day_of_week,
      period_number: slot.period_number,
      group_number: slot.group_number,
      course_name: slot.course_name,
      location: slot.location ?? "",
      instructor_name: slot.instructor_name ?? "",
    });
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!universityId || !yearId) return;
    if (!form.course_name.trim()) {
      setFormError("من فضلك اكتب اسم المادة.");
      return;
    }

    setSaving(true);
    const payload = {
      university_id: universityId,
      year_id: yearId,
      day_of_week: form.day_of_week,
      period_number: form.period_number,
      group_number: form.group_number,
      course_name: form.course_name.trim(),
      location: form.location.trim() || null,
      instructor_name: form.instructor_name.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from("general_schedule_slots").update(payload).eq("id", editingId)
      : await supabase.from("general_schedule_slots").insert(payload);

    setSaving(false);

    if (error) {
      // كود 23505 = unique constraint violation (نفس يوم+فترة+مجموعة موجود بالفعل)
      setFormError(
        error.code === "23505"
          ? "فيه حصة مضافة بالفعل لنفس اليوم والفترة والمجموعة."
          : `فشل الحفظ: ${error.message}`
      );
      return;
    }

    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("متأكد إنك عايز تحذف الحصة دي؟")) return;
    await supabase.from("general_schedule_slots").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="lg:w-80 lg:shrink-0">
        <div className="rounded-2xl border border-subtle bg-card p-4 shadow-sm">
          <label className="mb-1.5 block text-sm font-medium text-ink">الجامعة</label>
          <select
            value={universityId ?? ""}
            onChange={(e) => handleUniversityChange(Number(e.target.value))}
            className="mb-3 w-full rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <label className="mb-1.5 block text-sm font-medium text-ink">الفرقة</label>
          <select
            value={yearId ?? ""}
            onChange={(e) => setYearId(Number(e.target.value))}
            className="w-full rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {yearsForUniversity.length === 0 && <option value="">لا توجد فرق لهذه الجامعة</option>}
            {yearsForUniversity.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-2 rounded-2xl border border-subtle bg-card p-4 shadow-sm"
        >
          <h3 className="text-sm font-bold text-ink">{editingId ? "تعديل حصة" : "إضافة حصة"}</h3>

          <select
            value={form.day_of_week}
            onChange={(e) => setForm((prev) => ({ ...prev, day_of_week: Number(e.target.value) }))}
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            value={form.period_number}
            onChange={(e) => setForm((prev) => ({ ...prev, period_number: Number(e.target.value) }))}
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} ({p.timeRange})
              </option>
            ))}
          </select>

          <select
            value={form.group_number}
            onChange={(e) => setForm((prev) => ({ ...prev, group_number: Number(e.target.value) }))}
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            {GROUP_NUMBERS.map((g) => (
              <option key={g} value={g}>
                مجموعة {g}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={form.course_name}
            onChange={(e) => setForm((prev) => ({ ...prev, course_name: e.target.value }))}
            placeholder="اسم المادة"
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="القاعة (اختياري)"
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
          <input
            type="text"
            value={form.instructor_name}
            onChange={(e) => setForm((prev) => ({ ...prev, instructor_name: e.target.value }))}
            placeholder="اسم الدكتور (اختياري)"
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <div className="mt-1 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-ink shadow-sm disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 rounded-full border border-subtle px-4 py-2 text-sm font-semibold text-ink"
              >
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="min-w-0 flex-1">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted">جارٍ التحميل...</p>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl border border-subtle bg-card p-8 text-center text-sm text-muted shadow-sm">
            لا توجد حصص مضافة لهذه الجامعة/الفرقة بعد
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-subtle bg-card shadow-sm">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-subtle text-xs text-muted">
                  <th className="px-3 py-2 font-medium">اليوم</th>
                  <th className="px-3 py-2 font-medium">الفترة</th>
                  <th className="px-3 py-2 font-medium">المجموعة</th>
                  <th className="px-3 py-2 font-medium">المادة</th>
                  <th className="px-3 py-2 font-medium">القاعة</th>
                  <th className="px-3 py-2 font-medium">الدكتور</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {[...slots]
                  .sort(
                    (a, b) =>
                      a.day_of_week - b.day_of_week ||
                      a.period_number - b.period_number ||
                      a.group_number - b.group_number
                  )
                  .map((slot) => (
                    <tr key={slot.id} className="border-b border-subtle last:border-0">
                      <td className="px-3 py-2 text-muted">{dayLabel(slot.day_of_week)}</td>
                      <td className="px-3 py-2 text-muted">{periodLabel(slot.period_number)}</td>
                      <td className="px-3 py-2 text-muted">مجموعة {slot.group_number}</td>
                      <td className="px-3 py-2 font-medium text-ink">{slot.course_name}</td>
                      <td className="px-3 py-2 text-muted">{slot.location || "—"}</td>
                      <td className="px-3 py-2 text-muted">{slot.instructor_name || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(slot)}
                            className="text-xs font-medium text-gold hover:underline"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(slot.id)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
