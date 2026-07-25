import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type YearRow = {
  id: number;
  year_number: number;
  name: string;
  university_id: number | null;
};

type TermRow = {
  id: number;
  term_number: number;
  name: string;
  courses: { count: number }[];
};

export default async function YearDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: yearData, error: yearError } = await supabase
    .from("years")
    .select("id, year_number, name, university_id")
    .eq("id", id)
    .single();

  if (yearError || !yearData) {
    notFound();
  }

  const year = yearData as YearRow;

  const { data: termsData, error: termsError } = await supabase
    .from("terms")
    .select("id, term_number, name, courses(count)")
    .eq("year_id", id)
    .order("term_number");

  const terms = (termsData ?? []) as TermRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-card text-2xl font-bold text-gold">
          {year.year_number}
        </span>
        <h1 className="text-2xl font-extrabold text-ink sm:text-4xl">{year.name}</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          اختر الترم الدراسي للاطلاع على مواده
        </p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href={year.university_id ? `/universities/${year.university_id}` : "/universities"}
            className="mb-8 inline-block text-sm font-medium text-ink transition-colors hover:text-gold"
          >
            الرجوع للجامعة
          </Link>

          {termsError && (
            <p className="text-center text-sm text-red-600">حدث خطأ أثناء تحميل الترمين.</p>
          )}

          {!termsError && terms.length === 0 && (
            <p className="text-center text-sm text-muted">
              لا توجد ترمين مضافين لهذه السنة حاليًا.
            </p>
          )}

          {!termsError && terms.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2">
              {terms.map((term) => (
                <Link
                  key={term.id}
                  href={`/academic-years/${id}/terms/${term.id}`}
                  className="flex flex-col items-center gap-4 rounded-2xl border border-subtle bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-card text-2xl font-bold text-gold">
                    {term.term_number}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-ink">{term.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {term.courses?.[0]?.count ?? 0} مادة دراسية
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
