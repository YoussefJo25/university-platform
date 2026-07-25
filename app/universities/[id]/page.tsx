import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type UniversityRow = {
  id: number;
  name: string;
};

type YearRow = {
  id: number;
  year_number: number;
  name: string;
  courses: { count: number }[];
};

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: universityData, error: universityError } = await supabase
    .from("universities")
    .select("id, name")
    .eq("id", id)
    .single();

  if (universityError || !universityData) {
    notFound();
  }

  const university = universityData as UniversityRow;

  const { data: yearsData, error: yearsError } = await supabase
    .from("years")
    .select("id, year_number, name, courses(count)")
    .eq("university_id", id)
    .order("year_number");

  const years = (yearsData ?? []) as YearRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-4xl">{university.name}</h1>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          اختر السنة الدراسية للاطلاع على موادها
        </p>
      </section>

      <section className="flex-1 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/universities"
            className="mb-8 inline-block text-sm font-medium text-navy transition-colors hover:text-turquoise"
          >
            الرجوع للجامعات
          </Link>

          {yearsError && (
            <p className="text-center text-sm text-red-600">
              حدث خطأ أثناء تحميل السنين الدراسية. حاول مرة أخرى لاحقًا.
            </p>
          )}

          {!yearsError && years.length === 0 && (
            <p className="text-center text-sm text-navy/60">لا توجد سنين دراسية مضافة حاليًا.</p>
          )}

          {!yearsError && years.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {years.map((year) => (
                <Link
                  key={year.id}
                  href={`/academic-years/${year.id}`}
                  className="flex flex-col items-center gap-4 rounded-2xl border border-navy/10 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise text-2xl font-bold text-white">
                    {year.year_number}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-navy">{year.name}</h2>
                    <p className="mt-1 text-sm text-navy/60">
                      {year.courses?.[0]?.count ?? 0} مادة دراسية
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
