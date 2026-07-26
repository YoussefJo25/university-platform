import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type UniversityRow = {
  id: number;
  name: string;
  logo_url: string | null;
  description: string | null;
};

export default async function UniversitiesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, logo_url, description")
    .order("order_index");

  const universities = (data ?? []) as UniversityRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">الجامعات</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          اختر جامعتك للاطلاع على فرقها الدراسية ومحتواها
        </p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {error && (
            <p className="text-center text-sm text-red-600">
              حدث خطأ أثناء تحميل الجامعات. حاول مرة أخرى لاحقًا.
            </p>
          )}

          {!error && universities.length === 0 && (
            <p className="text-center text-sm text-muted">لا توجد جامعات مضافة حاليًا.</p>
          )}

          {!error && universities.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {universities.map((university) => (
                <Link
                  key={university.id}
                  href={`/universities/${university.id}`}
                  className="flex flex-col items-center gap-4 rounded-2xl border border-subtle bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
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
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-card text-2xl font-bold text-gold">
                      {university.name.trim().charAt(0)}
                    </span>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-ink">{university.name}</h2>
                    {university.description && (
                      <p className="mt-1 text-sm text-muted">{university.description}</p>
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
