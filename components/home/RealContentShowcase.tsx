import { BookOpen, Code2, PlayCircle } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export type CoursePreview = {
  id: number;
  name: string;
  category: "academic" | "learning_path";
  view_count: number;
  video_count: number;
  context_label: string | null;
};

export default function RealContentShowcase({ courses }: { courses: CoursePreview[] }) {
  if (courses.length === 0) return null;

  return (
    <ScrollReveal>
      <section className="bg-canvas px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-extrabold font-display text-ink sm:text-3xl">
          محتوى حقيقي، مش مجرد وعود
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted sm:text-base">
          نماذج فعلية من المواد والمسارات الموجودة بالفعل على المنصة
        </p>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          {courses.map((course) => {
            const Icon = course.category === "learning_path" ? Code2 : BookOpen;
            return (
              <div
                key={course.id}
                className="rounded-2xl border border-subtle bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-card-alt text-gold-light">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="mt-4 text-xs font-semibold text-gold-light">{course.context_label}</p>
                <h3 className="mt-1 text-lg font-bold text-ink">{course.name}</h3>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  {course.video_count > 0
                    ? `${course.video_count.toLocaleString("ar-EG")} فيديو`
                    : "محتوى متجدد"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      </section>
    </ScrollReveal>
  );
}
