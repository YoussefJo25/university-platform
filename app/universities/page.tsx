import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type UniversityRow = {
  id: number;
  name: string;
  logo_url: string | null;
  description: string | null;
};

export default async function UniversitiesPage() {
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, logo_url, description")
    .order("order_index");

  const universities = (data ?? []) as UniversityRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-4xl">الجامعات</h1>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          اختر جامعتك للاطلاع على فرقها الدراسية ومحتواها
        </p>
      </section>

      <section className="flex-1 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {error && (
            <p className="text-center text-sm text-red-600">
              حدث خطأ أثناء تحميل الجامعات. حاول مرة أخرى لاحقًا.
            </p>
          )}

          {!error && universities.length === 0 && (
            <p className="text-center text-sm text-navy/60">لا توجد جامعات مضافة حاليًا.</p>
          )}

          {!error && universities.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {universities.map((university) => (
                <Link
                  key={university.id}
                  href={`/universities/${university.id}`}
                  className="flex flex-col items-center gap-4 rounded-2xl border border-navy/10 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {university.logo_url ? (
                    <Image
                      src={university.logo_url}
                      alt={`شعار ${university.name}`}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise text-2xl font-bold text-white">
                      {university.name.trim().charAt(0)}
                    </span>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-navy">{university.name}</h2>
                    {university.description && (
                      <p className="mt-1 text-sm text-navy/60">{university.description}</p>
                    )}
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
