"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CourseRow = { id: number; name: string; has_section: boolean };
type SessionType = "lecture" | "section";
type AttendanceRecord = { course_id: number; session_type: SessionType; attended_at: string };

const SESSION_LABELS: Record<SessionType, string> = {
  lecture: "المحاضرة",
  section: "السكشن",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// آخر 14 يوم من الأقدم للأحدث (اليوم آخر عنصر) — بيتعرض جوه شريط dir="ltr"
// عشان يبان زي شبكة GitHub القياسية (الأقدم يمين... لأ، شمال، الأحدث يمين)
// بغض النظر عن اتجاه الصفحة العام (RTL).
function last14Days(): string[] {
  const days: string[] = [];
  const base = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function AttendanceTracker() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noUniversity, setNoUniversity] = useState(false);

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

      if (!profile?.year_id) {
        setNoUniversity(true);
        setLoading(false);
        return;
      }

      const [{ data: courseRows }, { data: attendanceRows }] = await Promise.all([
        supabase
          .from("courses")
          .select("id, name, has_section")
          .eq("category", "academic")
          .eq("year_id", profile.year_id)
          .order("order_index")
          .order("name"),
        supabase
          .from("attendance_records")
          .select("course_id, session_type, attended_at")
          .eq("profile_id", user.id),
      ]);

      setCourses((courseRows ?? []) as CourseRow[]);
      setRecords((attendanceRows ?? []) as AttendanceRecord[]);
      setLoading(false);
    }

    load();
  }, []);

  async function handleMark(courseId: number, sessionType: SessionType) {
    if (!userId) return;
    const today = todayStr();
    const already = records.some(
      (r) => r.course_id === courseId && r.session_type === sessionType && r.attended_at === today
    );
    if (already) return;

    const optimistic: AttendanceRecord = { course_id: courseId, session_type: sessionType, attended_at: today };
    setRecords((prev) => [...prev, optimistic]);

    const supabase = createClient();
    const { error } = await supabase.from("attendance_records").insert({
      profile_id: userId,
      course_id: courseId,
      session_type: sessionType,
    });

    if (error) {
      setRecords((prev) => prev.filter((r) => r !== optimistic));
      alert(`فشل تسجيل الحضور: ${error.message}`);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">جارٍ التحميل...</p>;
  }

  if (noUniversity) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-subtle bg-card p-8 text-center text-sm text-muted shadow-sm">
        من فضلك حدّد جامعتك وفرقتك من صفحة حسابك أولاً.
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-subtle bg-card p-8 text-center text-sm text-muted shadow-sm">
        لا توجد مواد مضافة لفرقتك حتى الآن.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {courses.map((course) => (
        <CourseAttendanceCard
          key={course.id}
          course={course}
          records={records.filter((r) => r.course_id === course.id)}
          onMark={(type) => handleMark(course.id, type)}
        />
      ))}
    </div>
  );
}

function CourseAttendanceCard({
  course,
  records,
  onMark,
}: {
  course: CourseRow;
  records: AttendanceRecord[];
  onMark: (type: SessionType) => void;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-card p-5 shadow-sm">
      <h2 className="text-base font-bold text-ink">{course.name}</h2>
      <div className={`mt-3 grid gap-4 ${course.has_section ? "sm:grid-cols-2" : ""}`}>
        <SessionBlock
          label={SESSION_LABELS.lecture}
          records={records.filter((r) => r.session_type === "lecture")}
          onMark={() => onMark("lecture")}
        />
        {course.has_section && (
          <SessionBlock
            label={SESSION_LABELS.section}
            records={records.filter((r) => r.session_type === "section")}
            onMark={() => onMark("section")}
          />
        )}
      </div>
    </div>
  );
}

function SessionBlock({
  label,
  records,
  onMark,
}: {
  label: string;
  records: AttendanceRecord[];
  onMark: () => void;
}) {
  const today = todayStr();
  const attendedToday = records.some((r) => r.attended_at === today);
  const attendedDates = new Set(records.map((r) => r.attended_at));
  const days = last14Days();

  return (
    <div className="rounded-xl border border-subtle bg-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <span className="text-xs text-muted">حضرت {records.length} مرة</span>
      </div>

      <button
        type="button"
        onClick={onMark}
        disabled={attendedToday}
        className={`mt-3 w-full rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-transform disabled:cursor-default ${
          attendedToday ? "bg-emerald-500/10 text-emerald-500" : "bg-gold text-gold-ink hover:scale-105"
        }`}
      >
        {attendedToday ? "تم تسجيل حضورك النهاردة ✓" : "سجّلت حضورك النهاردة"}
      </button>

      <div className="mt-3 flex items-center gap-1" dir="ltr">
        {days.map((day) => (
          <span
            key={day}
            title={day}
            className={`h-3 w-3 rounded-sm ${attendedDates.has(day) ? "bg-gold" : "bg-subtle"}`}
          />
        ))}
      </div>
    </div>
  );
}
