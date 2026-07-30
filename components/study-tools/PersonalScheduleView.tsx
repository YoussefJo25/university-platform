"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import ScheduleGrid, { type ScheduleGridSlot } from "@/components/study-tools/ScheduleGrid";
import { DAYS, PERIODS, GROUP_NUMBERS, dayLabel, periodLabel } from "@/lib/scheduleConstants";
import { useStudentGeneralSchedule } from "@/hooks/useStudentGeneralSchedule";

type PersonalSlot = ScheduleGridSlot & { color_tag: string | null };

type ImportableSlot = {
  day_of_week: number;
  period_number: number;
  course_name: string;
  location: string | null;
  instructor_name: string | null;
};

const COLOR_SWATCHES = ["#d4af37", "#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#f97316"];

const EMPTY_FORM = {
  day_of_week: 0,
  period_number: 1,
  course_name: "",
  location: "",
  instructor_name: "",
  color_tag: COLOR_SWATCHES[0] as string | null,
};

export default function PersonalScheduleView() {
  const [slots, setSlots] = useState<PersonalSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("personal_schedule_slots")
      .select("id, day_of_week, period_number, course_name, location, instructor_name, color_tag")
      .eq("user_id", user.id);

    setSlots((data ?? []) as PersonalSlot[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(slot: PersonalSlot) {
    setEditingId(slot.id);
    setForm({
      day_of_week: slot.day_of_week,
      period_number: slot.period_number,
      course_name: slot.course_name,
      location: slot.location ?? "",
      instructor_name: slot.instructor_name ?? "",
      color_tag: slot.color_tag ?? COLOR_SWATCHES[0],
    });
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.course_name.trim()) {
      setFormError("من فضلك اكتب اسم المادة.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      day_of_week: form.day_of_week,
      period_number: form.period_number,
      course_name: form.course_name.trim(),
      location: form.location.trim() || null,
      instructor_name: form.instructor_name.trim() || null,
      color_tag: form.color_tag,
    };

    const { error } = editingId
      ? await supabase.from("personal_schedule_slots").update(payload).eq("id", editingId)
      : await supabase.from("personal_schedule_slots").insert(payload);

    setSaving(false);

    if (error) {
      setFormError(`فشل الحفظ: ${error.message}`);
      return;
    }

    setIsFormOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("متأكد إنك عايز تحذف الحصة دي؟")) return;
    const supabase = createClient();
    await supabase.from("personal_schedule_slots").delete().eq("id", id);
    load();
  }

  async function handleImport(importedSlots: ImportableSlot[]) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("personal_schedule_slots").insert(
      importedSlots.map((s) => ({ ...s, user_id: user.id, color_tag: COLOR_SWATCHES[0] }))
    );
    setIsImportOpen(false);
    load();
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">جارٍ التحميل...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="rounded-full border border-gold px-4 py-2 text-xs font-semibold text-gold transition-colors hover:bg-gold hover:text-gold-ink"
        >
          استيراد من الجدول العام
        </button>
        <button
          type="button"
          onClick={openAddForm}
          className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105"
        >
          + إضافة حصة
        </button>
      </div>

      <ScheduleGrid
        slots={slots}
        emptyMessage="لسه مضفتش أي حصص لجدولك الشخصي"
        renderActions={(slot) => (
          <>
            <button
              type="button"
              onClick={() => openEditForm(slot as PersonalSlot)}
              className="text-[11px] font-medium text-gold hover:underline"
            >
              تعديل
            </button>
            <button
              type="button"
              onClick={() => handleDelete(slot.id)}
              className="text-[11px] font-medium text-red-600 hover:underline"
            >
              حذف
            </button>
          </>
        )}
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-subtle bg-card p-5 shadow-lg">
            <h3 className="text-sm font-bold text-ink">{editingId ? "تعديل حصة" : "إضافة حصة"}</h3>
            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
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
              </div>

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
                placeholder="المكان (اختياري)"
                className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              />
              <input
                type="text"
                value={form.instructor_name}
                onChange={(e) => setForm((prev) => ({ ...prev, instructor_name: e.target.value }))}
                placeholder="اسم الدكتور (اختياري)"
                className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              />

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">اللون:</span>
                {COLOR_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color_tag: color }))}
                    aria-label={`اختر اللون ${color}`}
                    className={`h-6 w-6 rounded-full border-2 ${
                      form.color_tag === color ? "border-ink" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {formError && <p className="text-xs text-red-600">{formError}</p>}

              <div className="mt-1 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-ink shadow-sm disabled:opacity-60"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 rounded-full border border-subtle px-4 py-2 text-sm font-semibold text-ink"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportOpen && (
        <ImportFromGeneralModal
          onClose={() => setIsImportOpen(false)}
          onImport={handleImport}
          existingSlots={slots}
        />
      )}
    </div>
  );
}

function ImportFromGeneralModal({
  onClose,
  onImport,
  existingSlots,
}: {
  onClose: () => void;
  onImport: (slots: ImportableSlot[]) => void;
  existingSlots: PersonalSlot[];
}) {
  const [groupNumber, setGroupNumber] = useState(1);
  const { status, slotsForGroup } = useStudentGeneralSchedule(groupNumber);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    const toImport = slotsForGroup
      .filter((s) => selectedIds.has(s.id))
      .map((s) => ({
        day_of_week: s.day_of_week,
        period_number: s.period_number,
        course_name: s.course_name,
        location: s.location,
        instructor_name: s.instructor_name,
      }));
    onImport(toImport);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-card p-5 shadow-lg">
        <h3 className="text-sm font-bold text-ink">استيراد من الجدول العام</h3>

        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="import-group-select" className="text-sm text-ink">
            مجموعتك:
          </label>
          <select
            id="import-group-select"
            value={groupNumber}
            onChange={(e) => setGroupNumber(Number(e.target.value))}
            className="rounded-lg border border-subtle bg-card px-3 py-1.5 text-sm text-ink outline-none focus:border-gold"
          >
            {GROUP_NUMBERS.map((g) => (
              <option key={g} value={g}>
                مجموعة {g}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 max-h-72 overflow-y-auto">
          {status === "loading" && <p className="py-6 text-center text-xs text-muted">جارٍ التحميل...</p>}
          {status === "no-university" && (
            <p className="py-6 text-center text-xs text-muted">
              من فضلك حدّد جامعتك وفرقتك من صفحة حسابك أولاً.
            </p>
          )}
          {status === "unavailable" && (
            <p className="py-6 text-center text-xs text-muted">جدول جامعتك لسه مش متاح.</p>
          )}
          {status === "ready" && slotsForGroup.length === 0 && (
            <p className="py-6 text-center text-xs text-muted">لا توجد حصص في الجدول العام لمجموعتك.</p>
          )}
          {status === "ready" &&
            slotsForGroup.map((slot) => {
              const alreadyImported = existingSlots.some(
                (s) =>
                  s.day_of_week === slot.day_of_week &&
                  s.period_number === slot.period_number &&
                  s.course_name === slot.course_name
              );
              return (
                <label key={slot.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-panel">
                  <input
                    type="checkbox"
                    disabled={alreadyImported}
                    checked={selectedIds.has(slot.id)}
                    onChange={() => toggle(slot.id)}
                  />
                  <span className={alreadyImported ? "text-muted line-through" : "text-ink"}>
                    {dayLabel(slot.day_of_week)} - {periodLabel(slot.period_number)} - {slot.course_name}
                  </span>
                </label>
              );
            })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="flex-1 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-gold-ink shadow-sm disabled:opacity-60"
          >
            استورد المحدد ({selectedIds.size})
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-subtle px-4 py-2 text-sm font-semibold text-ink"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
