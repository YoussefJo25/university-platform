import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type TermRow = {
  id: number;
  term_number: number;
  name: string;
  year_id: number;
  years: { name: string; year_number: number } | null;
};

type CourseRow = {
  id: number;
  name: string;
  description: string | null;
};

export default async function TermDetailPage({
  params,
}: {
  params: Promise<{ id: string; termId: string }>;
}) {
  const { id, termId } = await params;

  const { data: termData, error: termError } = await supabase
    .from("terms")
    .select("id, term_number, name, year_id, years(name, year_number)")
    .eq("id", termId)
    .single();

  if (termError || !termData || String(termData.year_id) !== id) {
    notFound();
  }

  const term = termData as unknown as TermRow;

  const { data: coursesData, error: coursesError } = await supabase
    .from("courses")
    .select("id, name, description")
    .eq("term_id", termId)
    .order("name");

  const courses = (coursesData ?? []) as CourseRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        {term.years && (
          <p className="text-xs font-medium text-muted sm:text-sm">{term.years.name}</p>
        )}
        <h1 className="mt-2 text-2xl font-extrabold font-display text-ink sm:text-4xl">{term.name}</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">المواد الدراسية الخاصة بهذا الترم</p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/academic-years/${id}`}
            className="mb-8 inline-block text-sm font-medium text-ink transition-colors hover:text-gold"
          >
            الرجوع لترمي {term.years?.name ?? "السنة الدراسية"}
          </Link>

          {coursesError && (
            <p className="text-center text-sm text-red-600">حدث خطأ أثناء تحميل المواد.</p>
          )}

          {!coursesError && courses.length === 0 && (
            <p className="text-center text-sm text-muted">
              لا توجد مواد مضافة لهذا الترم حاليًا.
            </p>
          )}

          {!coursesError && courses.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="rounded-2xl border border-subtle bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <h2 className="text-lg font-bold text-ink">{course.name}</h2>
                  {course.description && (
                    <p className="mt-2 text-sm text-muted">{course.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
