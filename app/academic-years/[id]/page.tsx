import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type YearRow = {
  id: number;
  year_number: number;
  name: string;
};

type CourseRow = {
  id: number;
  name: string;
  description: string | null;
};

export default async function YearDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: yearData, error: yearError } = await supabase
    .from("years")
    .select("id, year_number, name")
    .eq("id", id)
    .single();

  if (yearError || !yearData) {
    notFound();
  }

  const year = yearData as YearRow;

  const { data: coursesData, error: coursesError } = await supabase
    .from("courses")
    .select("id, name, description")
    .eq("year_id", id)
    .order("name");

  const courses = (coursesData ?? []) as CourseRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-14 text-center sm:px-6">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white">
          {year.year_number}
        </span>
        <h1 className="text-2xl font-extrabold text-white sm:text-4xl">{year.name}</h1>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          المواد الدراسية الخاصة بهذه السنة
        </p>
      </section>

      <section className="flex-1 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/academic-years"
            className="mb-8 inline-block text-sm font-medium text-navy transition-colors hover:text-turquoise"
          >
            الرجوع للسنين الدراسية
          </Link>

          {coursesError && (
            <p className="text-center text-sm text-red-600">حدث خطأ أثناء تحميل المواد.</p>
          )}

          {!coursesError && courses.length === 0 && (
            <p className="text-center text-sm text-navy/60">لا توجد مواد مضافة لهذه السنة حاليًا.</p>
          )}

          {!coursesError && courses.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <h2 className="text-lg font-bold text-navy">{course.name}</h2>
                  {course.description && (
                    <p className="mt-2 text-sm text-navy/70">{course.description}</p>
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
