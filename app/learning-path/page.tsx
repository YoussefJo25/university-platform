import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CourseRow = {
  id: number;
  name: string;
  description: string | null;
};

export default async function LearningPathPage() {
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("courses")
    .select("id, name, description")
    .eq("category", "learning_path")
    .is("parent_course_id", null)
    .order("order_index")
    .order("name");

  if (error) {
    // order_index ممكن يكون لسه معملوش migration (course_order_setup.sql)
    const withoutOrder = await supabase
      .from("courses")
      .select("id, name, description")
      .eq("category", "learning_path")
      .is("parent_course_id", null)
      .order("name");

    data = withoutOrder.data;
    error = withoutOrder.error;
  }

  if (error) {
    // parent_course_id ممكن يكون لسه معملوش migration (course_sections_setup.sql)
    const fallback = await supabase
      .from("courses")
      .select("id, name, description")
      .eq("category", "learning_path")
      .order("name");

    data = fallback.data;
    error = fallback.error;
  }

  const paths = (data ?? []) as CourseRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">مسار تعلم البرمجة</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          اختر المسار اللي يناسبك وابدأ التعلم خطوة بخطوة
        </p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {error && (
            <p className="text-center text-sm text-red-600">
              حدث خطأ أثناء تحميل مسارات التعلم. حاول مرة أخرى لاحقًا.
            </p>
          )}

          {!error && paths.length === 0 && (
            <p className="text-center text-sm text-muted">لا توجد مسارات تعلم مضافة حاليًا.</p>
          )}

          {!error && paths.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paths.map((path) => (
                <Link
                  key={path.id}
                  href={`/courses/${path.id}`}
                  className="rounded-2xl border border-subtle bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <h2 className="text-lg font-bold text-ink">{path.name}</h2>
                  {path.description && (
                    <p className="mt-2 text-sm text-muted">{path.description}</p>
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
