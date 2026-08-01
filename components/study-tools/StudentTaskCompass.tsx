"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type CourseRow = { id: number; name: string };
type StudentTask = {
  id: string;
  title: string;
  course_id: number | null;
  due_date: string;
  is_done: boolean;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(target: Date, from: Date): number {
  return Math.round((target.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function formatDaysRemaining(diffDays: number): string {
  if (diffDays < 0) return "متأخرة!";
  if (diffDays === 0) return "مستحقة النهاردة";
  if (diffDays === 1) return "باقي يوم";
  if (diffDays === 2) return "باقي يومين";
  if (diffDays <= 10) return `باقي ${diffDays} أيام`;
  return `باقي ${diffDays} يوم`;
}

function urgencyBorderClass(diffDays: number): string {
  if (diffDays <= 1) return "border-red-600";
  if (diffDays <= 7) return "border-gold";
  return "border-subtle";
}

export default function StudentTaskCompass() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", courseId: "", dueDate: todayStr() });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
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
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("year_id")
        .eq("id", user.id)
        .single();

      const [{ data: courseRows }, { data: taskRows }] = await Promise.all([
        profile?.year_id
          ? supabase
              .from("courses")
              .select("id, name")
              .eq("category", "academic")
              .eq("year_id", profile.year_id)
              .order("name")
          : Promise.resolve({ data: [] as CourseRow[] }),
        supabase
          .from("student_tasks")
          .select("id, title, course_id, due_date, is_done")
          .eq("profile_id", user.id),
      ]);

      setCourses((courseRows ?? []) as CourseRow[]);
      setTasks((taskRows ?? []) as StudentTask[]);
      setLoading(false);
    }

    load();
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    if (!form.title.trim() || !form.dueDate) {
      setFormError("من فضلك اكتب اسم المهمة وحدد تاريخ الاستحقاق.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("student_tasks")
      .insert({
        profile_id: userId,
        title: form.title.trim(),
        course_id: form.courseId ? Number(form.courseId) : null,
        due_date: form.dueDate,
      })
      .select("id, title, course_id, due_date, is_done")
      .single();

    setSaving(false);

    if (error || !data) {
      setFormError(`فشل إضافة المهمة: ${error?.message}`);
      return;
    }

    setTasks((prev) => [...prev, data as StudentTask]);
    setForm({ title: "", courseId: "", dueDate: todayStr() });
    setIsAddOpen(false);
  }

  async function handleToggleDone(task: StudentTask) {
    const next = !task.is_done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: next } : t)));

    const supabase = createClient();
    const { error } = await supabase.from("student_tasks").update({ is_done: next }).eq("id", task.id);

    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: task.is_done } : t)));
      alert(`فشل التحديث: ${error.message}`);
    }
  }

  async function handleDelete(taskId: string) {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    const supabase = createClient();
    const { error } = await supabase.from("student_tasks").delete().eq("id", taskId);

    if (error) {
      setTasks(previous);
      alert(`فشل الحذف: ${error.message}`);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">جارٍ التحميل...</p>;
  }

  const pending = [...tasks.filter((t) => !t.is_done)].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const done = [...tasks.filter((t) => t.is_done)].sort((a, b) => b.due_date.localeCompare(a.due_date));
  const courseById = new Map(courses.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsAddOpen((prev) => !prev)}
          className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105"
        >
          + إضافة مهمة جديدة
        </button>
      </div>

      {isAddOpen && (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-2xl border border-subtle bg-card p-4">
          <input
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="اسم المهمة"
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
          <select
            value={form.courseId}
            onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          >
            <option value="">بدون مادة (اختياري)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            required
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            className="rounded-lg border border-subtle bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-gold-ink shadow-sm disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="text-xs font-medium text-muted hover:text-ink"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {pending.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">مفيش مهام حالية — يلا ضيف أول مهمة!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              courseName={task.course_id ? courseById.get(task.course_id) : undefined}
              onToggleDone={() => handleToggleDone(task)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="rounded-2xl border border-subtle bg-card">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink">
            مهام مخلّصة <span className="font-normal text-muted">({done.length})</span>
          </summary>
          <div className="flex flex-col gap-2 p-3 pt-0">
            {done.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                courseName={task.course_id ? courseById.get(task.course_id) : undefined}
                onToggleDone={() => handleToggleDone(task)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TaskRow({
  task,
  courseName,
  onToggleDone,
  onDelete,
}: {
  task: StudentTask;
  courseName?: string;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const diffDays = daysBetween(parseDateOnly(task.due_date), parseDateOnly(todayStr()));
  const borderClass = task.is_done ? "border-subtle" : urgencyBorderClass(diffDays);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border-r-4 bg-card p-3 shadow-sm ${borderClass} ${
        task.is_done ? "opacity-60" : ""
      }`}
    >
      <input type="checkbox" checked={task.is_done} onChange={onToggleDone} className="h-4 w-4 accent-gold" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium text-ink ${task.is_done ? "line-through" : ""}`}>{task.title}</p>
        <p className="text-xs text-muted">
          {courseName && <span>{courseName} · </span>}
          {task.is_done
            ? new Date(task.due_date).toLocaleDateString("ar-EG")
            : formatDaysRemaining(diffDays)}
        </p>
      </div>
      <button type="button" onClick={onDelete} className="shrink-0 text-xs font-medium text-red-600 hover:underline">
        حذف
      </button>
    </div>
  );
}
