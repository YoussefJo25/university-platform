"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CourseRow = { id: number; name: string; has_section: boolean };
type SessionType = "lecture" | "section";
type AttendanceStatus = "present" | "absent";
type AttendanceRecord = {
  course_id: number;
  session_type: SessionType;
  attended_at: string;
  status: AttendanceStatus;
};

const SESSION_LABELS: Record<SessionType, string> = {
  lecture: "المحاضرة",
  section: "السكشن",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// آخر 14 يوم من الأقدم للأحدث (اليوم آخر عنصر) — بيتعرض جوه شريط dir="ltr"
// عشان يبان زي شبكة GitHub القياسية بغض النظر عن اتجاه الصفحة العام (RTL).
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
          .select("course_id, session_type, attended_at, status")
          .eq("profile_id", user.id),
      ]);

      setCourses((courseRows ?? []) as CourseRow[]);
      setRecords((attendanceRows ?? []) as AttendanceRecord[]);
      setLoading(false);
    }

    load();
  }, []);

  async function handleMark(courseId: number, sessionType: SessionType, status: AttendanceStatus) {
    if (!userId) return;
    const today = todayStr();
    const already = records.some(
      (r) => r.course_id === courseId && r.session_type === sessionType && r.attended_at === today
    );
    if (already) return;

    const optimistic: AttendanceRecord = {
      course_id: courseId,
      session_type: sessionType,
      attended_at: today,
      status,
    };
    setRecords((prev) => [...prev, optimistic]);

    const supabase = createClient();
    const { error } = await supabase.from("attendance_records").insert({
      profile_id: userId,
      course_id: courseId,
      session_type: sessionType,
      status,
    });

    if (error) {
      setRecords((prev) => prev.filter((r) => r !== optimistic));
      alert(`فشل تسجيل الحالة: ${error.message}`);
    }
  }

  async function handleReset(courseId: number, sessionType: SessionType, courseName: string) {
    const label = SESSION_LABELS[sessionType];
    const confirmed = confirm(
      `هل أنت متأكد؟ هيتمسح كل سجل حضورك لمادة ${courseName} - ${label} ومينفعش ترجعه تاني`
    );
    if (!confirmed || !userId) return;

    const previous = records;
    setRecords((prev) => prev.filter((r) => !(r.course_id === courseId && r.session_type === sessionType)));

    const supabase = createClient();
    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("profile_id", userId)
      .eq("course_id", courseId)
      .eq("session_type", sessionType);

    if (error) {
      setRecords(previous);
      alert(`فشل إعادة التعيين: ${error.message}`);
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
          onMark={(type, status) => handleMark(course.id, type, status)}
          onReset={(type) => handleReset(course.id, type, course.name)}
        />
      ))}
    </div>
  );
}

function CourseAttendanceCard({
  course,
  records,
  onMark,
  onReset,
}: {
  course: CourseRow;
  records: AttendanceRecord[];
  onMark: (type: SessionType, status: AttendanceStatus) => void;
  onReset: (type: SessionType) => void;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-card p-5 shadow-sm">
      <h2 className="text-base font-bold text-ink">{course.name}</h2>
      <div className={`mt-3 grid gap-4 ${course.has_section ? "sm:grid-cols-2" : ""}`}>
        <SessionBlock
          label={SESSION_LABELS.lecture}
          records={records.filter((r) => r.session_type === "lecture")}
          onMark={(status) => onMark("lecture", status)}
          onReset={() => onReset("lecture")}
        />
        {course.has_section && (
          <SessionBlock
            label={SESSION_LABELS.section}
            records={records.filter((r) => r.session_type === "section")}
            onMark={(status) => onMark("section", status)}
            onReset={() => onReset("section")}
          />
        )}
      </div>
    </div>
  );
}

function PercentageRing({ percentage }: { percentage: number | null }) {
  if (percentage === null) {
    return (
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-subtle text-center">
        <span className="text-[9px] leading-tight text-muted">لسه ما سجّلتش</span>
      </div>
    );
  }

  const color = percentage >= 75 ? "#10b981" : percentage >= 50 ? "#c9a227" : "#dc2626";

  return (
    <div
      className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} ${percentage * 3.6}deg, var(--subtle) 0deg)` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-panel">
        <span className="text-xs font-bold text-ink">{percentage}%</span>
      </div>
    </div>
  );
}

function SessionBlock({
  label,
  records,
  onMark,
  onReset,
}: {
  label: string;
  records: AttendanceRecord[];
  onMark: (status: AttendanceStatus) => void;
  onReset: () => void;
}) {
  const today = todayStr();
  const todayRecord = records.find((r) => r.attended_at === today);
  const presentCount = records.filter((r) => r.status === "present").length;
  const totalCount = records.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null;
  const statusByDate = new Map(records.map((r) => [r.attended_at, r.status]));
  const days = last14Days();

  return (
    <div className="rounded-xl border border-subtle bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <PercentageRing percentage={percentage} />
      </div>

      {todayRecord ? (
        <p
          className={`mt-3 rounded-full px-4 py-2 text-center text-xs font-semibold ${
            todayRecord.status === "present"
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-600/10 text-red-600"
          }`}
        >
          {todayRecord.status === "present" ? "سجّلت حضورك النهاردة ✓" : "سجّلت غيابك النهاردة"}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onMark("present")}
            className="flex-1 rounded-full bg-gold px-3 py-2 text-xs font-semibold text-gold-ink shadow-sm transition-transform hover:scale-105"
          >
            حضرت
          </button>
          <button
            type="button"
            onClick={() => onMark("absent")}
            className="flex-1 rounded-full border border-red-600 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
          >
            غبت
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1" dir="ltr">
        {days.map((day) => {
          const status = statusByDate.get(day);
          return (
            <span
              key={day}
              title={day}
              className={`h-3 w-3 rounded-sm ${
                status === "present" ? "bg-gold" : status === "absent" ? "bg-red-600" : "bg-subtle"
              }`}
            />
          );
        })}
      </div>

      {totalCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 text-[11px] font-medium text-muted transition-colors hover:text-red-600 hover:underline"
        >
          إعادة تعيين
        </button>
      )}
    </div>
  );
}
