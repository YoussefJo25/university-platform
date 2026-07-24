import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type CourseRow = {
  id: number;
  name: string;
  description: string | null;
};

export default async function LearningPathPage() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, description")
    .eq("category", "learning_path")
    .order("name");

  const paths = (data ?? []) as CourseRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-4xl">مسار تعلم البرمجة</h1>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          اختر المسار اللي يناسبك وابدأ التعلم خطوة بخطوة
        </p>
      </section>

      <section className="flex-1 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {error && (
            <p className="text-center text-sm text-red-600">
              حدث خطأ أثناء تحميل مسارات التعلم. حاول مرة أخرى لاحقًا.
            </p>
          )}

          {!error && paths.length === 0 && (
            <p className="text-center text-sm text-navy/60">لا توجد مسارات تعلم مضافة حاليًا.</p>
          )}

          {!error && paths.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paths.map((path) => (
                <Link
                  key={path.id}
                  href={`/courses/${path.id}`}
                  className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <h2 className="text-lg font-bold text-navy">{path.name}</h2>
                  {path.description && (
                    <p className="mt-2 text-sm text-navy/70">{path.description}</p>
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
